using Microsoft.Web.WebView2.WinForms;
using RDTrackingSystem.Data;
using RDTrackingSystem.Services;
using Microsoft.Extensions.Logging;
using System.Windows.Forms;
using System.Runtime.InteropServices;
using Microsoft.EntityFrameworkCore;

namespace RDTrackingSystem;

public partial class MainForm : Form, IMessageFilter
{
    // Windows API for global keyboard hook
    private const int WH_KEYBOARD_LL = 13;
    private const int WM_KEYDOWN = 0x0100;
    private const int WM_SYSKEYDOWN = 0x0104;
    [DllImport("kernel32.dll", CharSet = CharSet.Auto, SetLastError = true)]
    private static extern IntPtr GetModuleHandle(string lpModuleName);
    [DllImport("user32.dll", CharSet = CharSet.Auto, SetLastError = true)]
    private static extern IntPtr SetWindowsHookEx(int idHook, LowLevelKeyboardProc lpfn, IntPtr hMod, uint dwThreadId);
    private WebView2? _webView;
    private readonly ApiServer? _apiServer;
    private readonly ApplicationDbContext _context;
    private WebViewBridge? _bridge;
    private const int VK_F2 = 0x71;
    private const int VK_CONTROL = 0x11;
    private delegate IntPtr LowLevelKeyboardProc(int nCode, IntPtr wParam, IntPtr lParam);
    private LowLevelKeyboardProc? _proc = HookCallback;
    private static IntPtr _hookID = IntPtr.Zero;
    private static MainForm? _instance;
    [DllImport("user32.dll", CharSet = CharSet.Auto, SetLastError = true)]
    private static extern IntPtr CallNextHookEx(IntPtr hhk, int nCode, IntPtr wParam, IntPtr lParam);
    public MainForm(ApiServer? apiServer = null)
    {
        _apiServer = apiServer;
        
        // 使用重试机制创建数据库连接
        const int maxRetries = 3;
        
        for (int retry = 0; retry < maxRetries; retry++)
        {
            try
            {
                _context = new ApplicationDbContext();
                // 测试连接是否可用（通过尝试连接数据库）
                // EF Core 会在首次访问时自动打开连接
                var canConnect = _context.Database.CanConnect();
                if (canConnect)
                {
                    Console.WriteLine($"[MainForm] 数据库连接测试成功");
                    break; // 成功创建连接，退出循环
                }
                else
                {
                    throw new InvalidOperationException("无法连接到数据库");
                }
            }
            catch (Exception ex)
            {
                if (retry < maxRetries - 1)
                {
                    // 等待后重试
                    System.Threading.Thread.Sleep(500);
                }
                else
                {
                    var result = MessageBox.Show(
                        $"无法创建数据库连接: {ex.Message}\n\n" +
                        $"已重试 {maxRetries} 次。\n\n" +
                        "可能的原因:\n" +
                        "1. 数据库文件正在被其他程序使用\n" +
                        "2. 文件权限不足\n" +
                        "3. 文件已损坏\n\n" +
                        "是否要重试？程序将使用 HTTP API 模式继续运行。\n\n" +
                        $"堆栈跟踪:\n{ex.StackTrace}",
                        "数据库警告",
                        MessageBoxButtons.RetryCancel,
                        MessageBoxIcon.Warning);
                    
                    if (result == DialogResult.Retry)
                    {
                        // 重置重试计数，再试一次
                        retry = -1;
                        System.Threading.Thread.Sleep(1000);
                    }
                    else
                    {
                        // 继续运行，但 _context 为 null，将使用 HTTP API 模式
                        _context = null;
                        break;
                    }
                }
            }
        }
        
        InitializeComponent();
        
        try
        {
            InitializeWebView();
        }
        catch (Exception ex)
        {
            MessageBox.Show(
                $"WebView 初始化失败: {ex.Message}\n\n堆栈跟踪:\n{ex.StackTrace}",
                "初始化错误",
                MessageBoxButtons.OK,
                MessageBoxIcon.Error);
        }
        
        // Register message filter to capture global key presses
        Application.AddMessageFilter(this);
        _instance = this;
        // Install global keyboard hook (required in fullscreen mode)
        _hookID = SetHook(_proc);
    }
    // Install global keyboard hook
    private static IntPtr SetHook(LowLevelKeyboardProc proc)
    {
        using (var curProcess = System.Diagnostics.Process.GetCurrentProcess())
        using (var curModule = curProcess.MainModule)
        {
            return SetWindowsHookEx(WH_KEYBOARD_LL, proc,
                GetModuleHandle(curModule?.ModuleName ?? "user32"), 0);
        }
    }
    // Keyboard hook callback function
    private static IntPtr HookCallback(int nCode, IntPtr wParam, IntPtr lParam)
    {
        if (nCode >= 0 && (wParam == (IntPtr)WM_KEYDOWN || wParam == (IntPtr)WM_SYSKEYDOWN))
        {
            // Read keyboard structure
            KBDLLHOOKSTRUCT hookStruct = Marshal.PtrToStructure<KBDLLHOOKSTRUCT>(lParam);
            int vkCode = hookStruct.vkCode;
            Keys keyCode = (Keys)vkCode & Keys.KeyCode;

            // Check Ctrl key state from keyboard flags
            // Bit 4 of flags indicates extended key (Alt, etc.), we need to check actual Ctrl key state
            // Use GetAsyncKeyState to check if Ctrl key is pressed
            bool ctrlPressed = (GetAsyncKeyState(0x11) & 0x8000) != 0; // VK_CONTROL = 0x11

            // Capture Ctrl + F2
            if (keyCode == Keys.F2 && ctrlPressed && _instance != null)
            {
                // Close form on UI thread
                if (_instance.InvokeRequired)
                {
                    _instance.BeginInvoke(new Action(() => _instance.Close()));
                }
                else
                {
                    _instance.Close();
                }
                // Return non-zero value to indicate processed, block message from continuing
                return (IntPtr)1;
            }

            // Block F12
            if (keyCode == Keys.F12)
            {
                return (IntPtr)1; // Block F12
            }
        }

        return CallNextHookEx(_hookID, nCode, wParam, lParam);
    }
    [DllImport("user32.dll")]
    private static extern short GetAsyncKeyState(int vKey);

    // Keyboard hook structure
    [StructLayout(LayoutKind.Sequential)]
    private struct KBDLLHOOKSTRUCT
    {
        public int vkCode;
        public int scanCode;
        public int flags;
        public int time;
        public IntPtr dwExtraInfo;
    }
    public bool PreFilterMessage(ref Message m)
    {
        const int WM_KEYDOWN = 0x0100;
        const int WM_SYSKEYDOWN = 0x0104; // System key (including Alt combinations)

        // Handle key down and release messages
        if (m.Msg == WM_KEYDOWN || m.Msg == WM_SYSKEYDOWN)
        {
            // Get key code
            int vkCode = (int)m.WParam;
            Keys keyCode = (Keys)vkCode & Keys.KeyCode;

            // Check modifier key state (from message lParam)
            bool ctrlPressed = (Control.ModifierKeys & Keys.Control) == Keys.Control;
            bool altPressed = (Control.ModifierKeys & Keys.Alt) == Keys.Alt;
            bool shiftPressed = (Control.ModifierKeys & Keys.Shift) == Keys.Shift;

            // Detect Ctrl + F2 (priority handling in fullscreen mode)
            if (keyCode == Keys.F2 && ctrlPressed)
            {
                // Use BeginInvoke to ensure execution on UI thread
                if (this.InvokeRequired)
                {
                    this.BeginInvoke(new Action(() => this.Close()));
                }
                else
                {
                    this.Close();
                }
                return true; // Indicate message processed, do not pass down
            }

            // Block F12 key (disable developer tools)
            if (keyCode == Keys.F12)
            {
                return true; // Block F12
            }
        }

        return false;
    }
    private void InitializeComponent()
    {
            this.SuspendLayout();
            // 
            // MainForm
            // 
            this.BackColor = System.Drawing.SystemColors.ActiveCaptionText;
            this.ClientSize = new System.Drawing.Size(1421, 843);
            this.FormBorderStyle = System.Windows.Forms.FormBorderStyle.None;
            this.Name = "MainForm";
            this.StartPosition = System.Windows.Forms.FormStartPosition.CenterScreen;
            this.Text = "AssetFlow";
            this.WindowState = System.Windows.Forms.FormWindowState.Maximized;
            this.ResumeLayout(false);

    }

    private async void InitializeWebView()
    {
        _webView = new WebView2
        {
            Dock = DockStyle.Fill
        };

        this.Controls.Add(_webView);

        // 等待 WebView2 初始化
        await _webView.EnsureCoreWebView2Async();

        // 设置 WebView2 选项
        // 禁用鼠标手势功能，防止拖动时关闭弹窗
        _webView.CoreWebView2.Settings.IsSwipeNavigationEnabled = false;
        _webView.CoreWebView2.Settings.AreBrowserAcceleratorKeysEnabled = false;
        
        _webView.CoreWebView2.Settings.IsZoomControlEnabled = true;
        _webView.CoreWebView2.Settings.AreDefaultContextMenusEnabled = true;
        _webView.CoreWebView2.Settings.AreHostObjectsAllowed = true;
        // --- Core Security Settings ---
        // 1. Completely disable native context menu (block all right-click popups)
        _webView.CoreWebView2.Settings.AreDefaultContextMenusEnabled = false;
        _webView.CoreWebView2.Settings.AreHostObjectsAllowed = true;

        // 2. Completely disable F12 developer tools
        _webView.CoreWebView2.Settings.AreDevToolsEnabled = true;
        // 禁用缓存以确保加载最新文件
        _webView.CoreWebView2.Settings.AreBrowserAcceleratorKeysEnabled = false;

        // 创建桥接对象并注入到 JavaScript（仅在数据库连接成功时）
        if (_context != null)
        {
            try
            {
                var logger = FileLogger.Instance;
                logger.LogInfo("创建 WebViewBridge 对象...", "MainForm");
                
                _bridge = new WebViewBridge(_context);
                
                // 注入桥接对象到 JavaScript 环境
                // 在 JavaScript 中可以通过 window.chrome.webview.hostObjects.nativeBridge 访问
                _webView.CoreWebView2.AddHostObjectToScript("nativeBridge", _bridge);
                
                logger.LogInfo("WebViewBridge 对象已创建并注入到 JavaScript", "MainForm");
            }
            catch (Exception ex)
            {
                MessageBox.Show(
                    $"无法创建 WebView 桥接对象: {ex.Message}\n\n程序将使用 HTTP API 模式。\n\n堆栈跟踪:\n{ex.StackTrace}",
                    "警告",
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Warning);
            }
        }
        else
        {
            MessageBox.Show(
                "数据库连接失败，程序将使用 HTTP API 模式。\n某些功能可能无法正常工作。",
                "数据库警告",
                MessageBoxButtons.OK,
                MessageBoxIcon.Warning);
        }
        
        // 添加错误监听
        _webView.CoreWebView2.DOMContentLoaded += (sender, args) =>
        {
            // 页面加载完成后检查是否有错误
            _webView.CoreWebView2.ExecuteScriptAsync(@"
                window.addEventListener('error', function(e) {
                    console.error('页面错误:', e.message, e.filename, e.lineno);
                });
                window.addEventListener('unhandledrejection', function(e) {
                    console.error('未处理的 Promise 拒绝:', e.reason);
                });
            ");
        };

        // 添加初始化脚本，确保桥接对象可用并输出调试信息
        var initScript = @"
            (function() {
                console.log('========== 页面开始加载 ==========');
                console.log('window.chrome:', window.chrome);
                console.log('window.chrome.webview:', window.chrome?.webview);
                console.log('window.chrome.webview.hostObjects:', window.chrome?.webview?.hostObjects);
                console.log('window.chrome.webview.hostObjects.nativeBridge:', window.chrome?.webview?.hostObjects?.nativeBridge);
                
                if (window.chrome && window.chrome.webview && window.chrome.webview.hostObjects) {
                    const bridge = window.chrome.webview.hostObjects.nativeBridge;
                    if (bridge) {
                        console.log('✅ Native bridge initialized successfully');
                        console.log('Available methods:', Object.keys(bridge));
                        
                        // 测试调用GetUsers方法
                        setTimeout(async () => {
                            try {
                                console.log('========== 测试调用GetUsers() ==========');
                                const result = await bridge.GetUsers();
                                console.log('GetUsers() 返回结果类型:', typeof result);
                                console.log('GetUsers() 返回结果:', result);
                                if (typeof result === 'string') {
                                    try {
                                        const parsed = JSON.parse(result);
                                        console.log('GetUsers() JSON解析成功:', parsed);
                                        console.log('用户数量:', Array.isArray(parsed) ? parsed.length : 'N/A');
                                    } catch (e) {
                                        console.error('GetUsers() JSON解析失败:', e);
                                    }
                                }
                            } catch (error) {
                                console.error('GetUsers() 调用失败:', error);
                            }
                        }, 1000);
                    } else {
                        console.warn('⚠️ Native bridge对象不存在');
                    }
                } else {
                    console.warn('⚠️ Native bridge not available, will use HTTP API');
                }
            })();
        ";
        await _webView.CoreWebView2.AddScriptToExecuteOnDocumentCreatedAsync(initScript);

        // 加载本地 HTML 文件（如果存在）或使用 API 服务器
        var baseDir = AppDomain.CurrentDomain.BaseDirectory;
        var wwwrootPath = Path.Combine(baseDir, "wwwroot", "index.html");
        var wwwrootDir = Path.Combine(baseDir, "wwwroot");
        
        // 检查是否存在 dist 目录（可能在前端项目根目录）
        var projectRoot = Directory.GetParent(baseDir)?.Parent?.Parent?.FullName ?? baseDir;
        var distPath = Path.Combine(projectRoot, "dist", "index.html");
        
        if (File.Exists(wwwrootPath))
        {
            // 优先使用 HTTP 服务器提供静态文件（避免 file:// 协议的 CORS 和路径问题）
            if (_apiServer != null)
            {
                var baseUrl = _apiServer.GetBaseUrl();
                // 添加时间戳参数以清除缓存
                var urlWithCacheBust = $"{baseUrl}?t={DateTime.Now.Ticks}";
                _webView.CoreWebView2.Navigate(urlWithCacheBust);
            }
            else
            {
                // 如果没有 API 服务器，使用 file:// 协议
                var fileUrl = $"file:///{wwwrootPath.Replace("\\", "/")}";
                _webView.CoreWebView2.Navigate(fileUrl);
            }
        }
        else if (File.Exists(distPath))
        {
            // 如果 dist 目录存在，尝试复制文件
            try
            {
                if (!Directory.Exists(wwwrootDir))
                {
                    Directory.CreateDirectory(wwwrootDir);
                }
                
                var distDir = Path.Combine(projectRoot, "dist");
                CopyDirectory(distDir, wwwrootDir, true);
                
                if (File.Exists(wwwrootPath))
                {
                    _webView.CoreWebView2.Navigate($"file:///{wwwrootPath.Replace("\\", "/")}");
                }
                else
                {
                    ShowErrorPage("已尝试从 dist 目录复制文件，但复制后仍找不到 index.html");
                }
            }
            catch (Exception ex)
            {
                ShowErrorPage($"尝试复制文件时出错: {ex.Message}");
            }
        }
        else if (_apiServer != null)
        {
            // 回退到使用 API 服务器
            var baseUrl = _apiServer.GetBaseUrl();
            _webView.CoreWebView2.Navigate(baseUrl);
        }
        else
        {
            // 显示详细的错误页面
            var errorMessage = $@"
                <h2>无法找到 Web 应用文件</h2>
                <p><strong>请按照以下步骤操作：</strong></p>
                <ol>
                    <li>在项目根目录运行: <code>npm run build</code></li>
                    <li>运行构建脚本: <code>.\build-and-copy.ps1</code> (Windows) 或 <code>./build-and-copy.sh</code> (Linux/Mac)</li>
                    <li>或者手动将 <code>dist</code> 目录中的所有文件复制到 <code>RDTrackingSystem\wwwroot\</code> 目录</li>
                </ol>
                <p><strong>预期文件位置：</strong></p>
                <ul>
                    <li>wwwroot: <code>{wwwrootPath}</code></li>
                    <li>dist: <code>{distPath}</code></li>
                </ul>
            ";
            ShowErrorPage(errorMessage);
        }
    }
    
    private void ShowErrorPage(string message)
    {
        _webView?.CoreWebView2?.NavigateToString($@"
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset='UTF-8'>
                <title>错误 - AssetFlow</title>
                <style>
                    body {{ 
                        font-family: 'Segoe UI', Arial, sans-serif; 
                        padding: 40px; 
                        background: #1a1a1a;
                        color: #e0e0e0;
                        line-height: 1.6;
                    }}
                    .container {{
                        max-width: 800px;
                        margin: 0 auto;
                        background: #2a2a2a;
                        padding: 30px;
                        border-radius: 8px;
                        box-shadow: 0 4px 6px rgba(0,0,0,0.3);
                    }}
                    h1 {{ color: #ff6b6b; margin-top: 0; }}
                    h2 {{ color: #4ecdc4; }}
                    code {{
                        background: #1a1a1a;
                        padding: 2px 6px;
                        border-radius: 3px;
                        color: #ffd93d;
                        font-family: 'Consolas', monospace;
                    }}
                    ol, ul {{ margin: 10px 0; padding-left: 30px; }}
                    li {{ margin: 8px 0; }}
                </style>
            </head>
            <body>
                <div class='container'>
                    <h1>⚠️ 错误</h1>
                    {message}
                </div>
            </body>
            </html>
        ");
    }
    
    private void CopyDirectory(string sourceDir, string destDir, bool recursive)
    {
        var dir = new DirectoryInfo(sourceDir);
        if (!dir.Exists)
        {
            throw new DirectoryNotFoundException($"源目录不存在: {sourceDir}");
        }

        DirectoryInfo[] dirs = dir.GetDirectories();
        Directory.CreateDirectory(destDir);

        foreach (FileInfo file in dir.GetFiles())
        {
            string targetFilePath = Path.Combine(destDir, file.Name);
            file.CopyTo(targetFilePath, true);
        }

        if (recursive)
        {
            foreach (DirectoryInfo subDir in dirs)
            {
                string newDestinationDir = Path.Combine(destDir, subDir.Name);
                CopyDirectory(subDir.FullName, newDestinationDir, true);
            }
        }
    }

    protected override void OnFormClosed(FormClosedEventArgs e)
    {
        // 移除消息过滤器
        Application.RemoveMessageFilter(this);
        _context?.Dispose();
        base.OnFormClosed(e);
    }

    // 实现 IMessageFilter 接口的 PreFilterMessage 方法
    public bool PreFilterMessage1(ref Message m)
    {
        // 检查是否是键盘按下消息
        if (m.Msg == WM_KEYDOWN)
        {
            // 检查是否按下了 F2 键
            if ((int)m.WParam == VK_F2)
            {
                // 检查 Ctrl 键是否被按下
                if (Control.ModifierKeys == Keys.Control)
                {
                    // Ctrl+F2 被按下，关闭程序
                    this.Invoke((MethodInvoker)delegate
                    {
                        this.Close();
                    });
                    return true; // 消息已处理，不再传递
                }
            }
        }
        return false; // 消息未处理，继续传递
    }

    // 重写 WndProc 方法作为备用方案
    protected override void WndProc(ref Message m)
    {
        // 处理键盘消息
        if (m.Msg == WM_KEYDOWN)
        {
            // 检查是否按下了 F2 键
            if ((int)m.WParam == VK_F2)
            {
                // 检查 Ctrl 键是否被按下
                if (Control.ModifierKeys == Keys.Control)
                {
                    // Ctrl+F2 被按下，关闭程序
                    this.Close();
                    return; // 消息已处理，不再调用基类方法
                }
            }
        }
        
        // 调用基类的 WndProc 处理其他消息
        base.WndProc(ref m);
    }
}
