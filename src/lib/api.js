// 检测是否可以使用原生桥接（直接通信）
function checkNativeBridge() {
  try {
    const hasBridge = window.chrome && 
           window.chrome.webview && 
           window.chrome.webview.hostObjects &&
           window.chrome.webview.hostObjects.nativeBridge;
    
    console.log('[checkNativeBridge] 检测结果:', {
      hasChrome: !!window.chrome,
      hasWebView: !!(window.chrome && window.chrome.webview),
      hasHostObjects: !!(window.chrome && window.chrome.webview && window.chrome.webview.hostObjects),
      hasNativeBridge: !!hasBridge,
      bridgeObject: window.chrome?.webview?.hostObjects?.nativeBridge
    });
    
    return hasBridge;
  } catch (e) {
    console.error('[checkNativeBridge] 检测失败:', e);
    return false;
  }
}

// 延迟检测，确保 WebView2 已经注入桥接对象
let useNativeBridge = false;

// 立即检测一次
useNativeBridge = checkNativeBridge();
console.log('[api.js] 初始检测 useNativeBridge:', useNativeBridge);

// 如果第一次检测失败，延迟再检测一次（给 WebView2 时间注入）
if (!useNativeBridge) {
  setTimeout(() => {
    useNativeBridge = checkNativeBridge();
    console.log('[checkNativeBridge] 延迟检测结果:', useNativeBridge);
  }, 1000);
  
  // 再延迟一次检测（有些情况下需要更长时间）
  setTimeout(() => {
    const finalCheck = checkNativeBridge();
    if (finalCheck !== useNativeBridge) {
      useNativeBridge = finalCheck;
      console.log('[checkNativeBridge] 最终检测结果:', useNativeBridge);
    }
  }, 2000);
}

// 导出函数以便动态检测
export function getUseNativeBridge() {
  return checkNativeBridge();
}

// 原生桥接通信（直接调用 C# 方法，无 HTTP 开销）
async function nativeRequest(method, ...args) {
  const logPrefix = `[nativeRequest ${method}]`;
  try {
    console.log(`${logPrefix} ========== 开始调用方法 ==========`);
    console.log(`${logPrefix} 参数:`, args);
    console.log(`${logPrefix} useNativeBridge 全局变量:`, useNativeBridge);
    
    // 动态检测桥接对象
    const bridge = window.chrome?.webview?.hostObjects?.nativeBridge;
    console.log(`${logPrefix} 桥接对象:`, bridge);
    
    if (!bridge) {
      console.error(`${logPrefix} 原生桥接不可用`);
      console.error(`${logPrefix} window.chrome:`, window.chrome);
      console.error(`${logPrefix} window.chrome.webview:`, window.chrome?.webview);
      console.error(`${logPrefix} window.chrome.webview.hostObjects:`, window.chrome?.webview?.hostObjects);
      throw new Error('原生桥接不可用');
    }
    
    console.log(`[nativeRequest] 桥接对象已获取，准备调用方法: ${method}`);
    
    // WebView2 的 hostObjects 返回的是异步代理对象
    // 需要将参数序列化为 JSON 字符串
    const stringArgs = args.map(arg => {
      if (typeof arg === 'string') {
        return arg;
      }
      return JSON.stringify(arg);
    });
    
    console.log(`[nativeRequest] 参数已序列化，准备调用: ${method}`, stringArgs);
    
    // 调用 C# 方法（WebView2 会自动处理异步）
    let result;
    const startTime = Date.now();
    try {
      if (stringArgs.length === 0) {
        console.log(`[nativeRequest] 调用无参数方法: ${method}`);
        result = await bridge[method]();
      } else if (stringArgs.length === 1) {
        console.log(`[nativeRequest] 调用单参数方法: ${method}`, stringArgs[0]);
        result = await bridge[method](stringArgs[0]);
      } else if (stringArgs.length === 2) {
        console.log(`[nativeRequest] 调用双参数方法: ${method}`, stringArgs);
        result = await bridge[method](stringArgs[0], stringArgs[1]);
      } else {
        console.log(`[nativeRequest] 调用多参数方法: ${method}`, stringArgs);
        result = await bridge[method](...stringArgs);
      }
      const duration = Date.now() - startTime;
      console.log(`[nativeRequest] 方法调用完成: ${method}，耗时: ${duration}ms`, result);
    } catch (callError) {
      console.error(`[nativeRequest] 方法调用失败: ${method}`, callError);
      throw callError;
    }
    
    // 解析返回的 JSON 字符串
    let parsed;
    try {
      parsed = typeof result === 'string' ? JSON.parse(result) : result;
      console.log(`[nativeRequest] 结果已解析: ${method}`, parsed);
    } catch (parseError) {
      console.error(`[nativeRequest] JSON 解析失败: ${method}`, parseError, '原始结果:', result);
      throw new Error('数据解析失败: ' + parseError.message);
    }
    
    // 检查是否有错误（对于 GetTasks 等返回数组的方法，错误对象会被调用者处理）
    // 不在这里抛出异常，让调用者决定如何处理
    if (parsed && parsed.error && typeof parsed.error === 'string') {
      console.error(`[nativeRequest] 方法返回错误: ${method}`, parsed.error);
      // 返回错误对象，让调用者处理
      return parsed;
    }
    
    console.log(`[nativeRequest] 方法调用成功: ${method}，返回数据长度:`, Array.isArray(parsed) ? parsed.length : 'N/A');
    return parsed;
  } catch (error) {
    console.error(`[nativeRequest] 异常: ${method}`, error);
    throw error;
  }
}

// HTTP API 请求（备用方案）
const API_BASE_URL = window.location.origin;

async function httpRequest(endpoint, options = {}) {
  const url = `${API_BASE_URL}/api/${endpoint}`;
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  };

  if (config.body && typeof config.body === 'object') {
    config.body = JSON.stringify(config.body);
  }

  try {
    const response = await fetch(url, config);
    
    const data = await response.json().catch(() => ({ error: '响应解析失败' }));
    
    if (!response.ok) {
      const errorMsg = data.error || data.message || `HTTP error! status: ${response.status}`;
      throw new Error(errorMsg);
    }

    // 检查响应中是否包含错误字段
    if (data && data.error) {
      throw new Error(data.error);
    }

    return data;
  } catch (error) {
    console.error('HTTP Request Error:', error);
    throw error;
  }
}

// 项目 API
export const projectsApi = {
  getAll: async () => {
    try {
      if (useNativeBridge) {
        const result = await nativeRequest('GetProjects');
        // 确保返回的是数组
        if (Array.isArray(result)) {
          return result;
        }
        // 如果返回的是错误对象，记录并返回空数组
        if (result && result.error) {
          console.error('GetProjects error:', result.error);
          console.error('GetProjects error details:', result.details);
          return [];
        }
        // 如果返回的不是数组，尝试转换或返回空数组
        console.warn('GetProjects returned non-array:', result);
        return [];
      }
      return httpRequest('projects');
    } catch (error) {
      console.error('projectsApi.getAll error:', error);
      return [];
    }
  },
  
  getById: async (id) => {
    if (useNativeBridge) {
      const result = await nativeRequest('GetProject', id);
      // nativeRequest 已经解析了 JSON，直接返回
      const parsedResult = typeof result === 'string' ? JSON.parse(result) : result;
      console.log('[projectsApi.getById] 返回结果:', parsedResult);
      console.log('[projectsApi.getById] timeline:', parsedResult?.timeline);
      return parsedResult;
    }
    return httpRequest(`projects/${id}`);
  },
  
  create: async (data) => {
    if (useNativeBridge) {
      const result = await nativeRequest('CreateProject', data);
      if (result && result.error) {
        throw new Error(result.error);
      }
      return result;
    }
    const result = await httpRequest('projects', { method: 'POST', body: data });
    if (result && result.error) {
      throw new Error(result.error);
    }
    return result;
  },
  
  update: async (id, data) => {
    if (useNativeBridge) {
      console.log('[projectsApi.update] 准备更新项目，ID:', id);
      console.log('[projectsApi.update] 更新数据:', data);
      console.log('[projectsApi.update] timeline 数据:', data?.timeline);
      const result = await nativeRequest('UpdateProject', id, data);
      console.log('[projectsApi.update] 更新结果:', result);
      if (result && result.error) {
        throw new Error(result.error);
      }
      return result;
    }
    const result = await httpRequest(`projects/${id}`, { method: 'PUT', body: data });
    if (result && result.error) {
      throw new Error(result.error);
    }
    return result;
  },
  
  delete: async (id) => {
    if (useNativeBridge) {
      return nativeRequest('DeleteProject', id);
    }
    return httpRequest(`projects/${id}`, { method: 'DELETE' });
  },
};

// 项目文件夹管理 API
export const projectFolderApi = {
  getRootPath: async () => {
    if (useNativeBridge) {
      return nativeRequest('GetProjectsRootPath');
    }
    return httpRequest('projects/folder/root');
  },

  setRootPath: async (path) => {
    if (useNativeBridge) {
      return nativeRequest('SetProjectsRootPath', JSON.stringify({ path }));
    }
    return httpRequest('projects/folder/root', {
      method: 'POST',
      body: { path }
    });
  },

  openFolder: async (projectPath) => {
    if (useNativeBridge) {
      return nativeRequest('OpenProjectFolder', JSON.stringify({ projectPath }));
    }
    return httpRequest('projects/folder/open', {
      method: 'POST',
      body: { projectPath }
    });
  },
};

// 用户 API
export const usersApi = {
  getAll: async () => {
    const logPrefix = '[usersApi.getAll]';
    try {
      console.log(`${logPrefix} ========== 开始获取用户数据 ==========`);
      console.log(`${logPrefix} 使用原生桥接: ${useNativeBridge}`);
      
      if (useNativeBridge) {
        console.log(`${logPrefix} 调用 nativeRequest('GetUsers')...`);
        const startTime = Date.now();
        
        const result = await nativeRequest('GetUsers');
        
        const duration = Date.now() - startTime;
        console.log(`${logPrefix} nativeRequest 完成，耗时: ${duration}ms`);
        console.log(`${logPrefix} 返回结果类型: ${typeof result}`);
        console.log(`${logPrefix} 是否为数组: ${Array.isArray(result)}`);
        console.log(`${logPrefix} 结果值:`, result);
        
        // 如果结果是字符串，尝试解析为 JSON
        if (typeof result === 'string') {
          console.log(`${logPrefix} 结果是字符串，尝试解析 JSON...`);
          try {
            const parsed = JSON.parse(result);
            console.log(`${logPrefix} JSON 解析成功，类型: ${typeof parsed}, 是否为数组: ${Array.isArray(parsed)}`);
            if (Array.isArray(parsed)) {
              console.log(`${logPrefix} 成功获取 ${parsed.length} 个用户`);
              if (parsed.length > 0) {
                console.log(`${logPrefix} 第一个用户示例:`, parsed[0]);
              }
              return parsed;
            }
            console.warn(`${logPrefix} 解析后的结果不是数组:`, parsed);
            return [];
          } catch (parseError) {
            console.error(`${logPrefix} JSON 解析失败:`, parseError);
            console.error(`${logPrefix} 原始字符串:`, result.substring(0, 200));
            return [];
          }
        }
        
        // 确保返回的是数组
        if (Array.isArray(result)) {
          console.log(`${logPrefix} 成功获取 ${result.length} 个用户`);
          if (result.length > 0) {
            console.log(`${logPrefix} 第一个用户示例:`, result[0]);
          }
          return result;
        }
        
        // 如果返回的是错误对象，记录并返回空数组
        if (result && typeof result === 'object' && result.error) {
          console.error(`${logPrefix} GetUsers 返回错误:`, result.error);
          console.error(`${logPrefix} 错误详情:`, result.details);
          return [];
        }
        
        // 如果返回的不是数组，尝试转换或返回空数组
        console.warn(`${logPrefix} GetUsers 返回非数组类型:`, result);
        console.warn(`${logPrefix} 返回类型: ${typeof result}`);
        return [];
      }
      
      console.log(`${logPrefix} 使用 HTTP API`);
      const httpResult = await httpRequest('users');
      console.log(`${logPrefix} HTTP API 返回结果:`, httpResult);
      return httpResult;
    } catch (error) {
      console.error(`${logPrefix} ========== 获取用户数据失败 ==========`);
      console.error(`${logPrefix} 错误:`, error);
      console.error(`${logPrefix} 错误消息:`, error.message);
      console.error(`${logPrefix} 错误堆栈:`, error.stack);
      return [];
    } finally {
      console.log(`${logPrefix} ========== 获取用户数据结束 ==========`);
    }
  },
  
  getById: async (id) => {
    if (useNativeBridge) {
      return nativeRequest('GetUser', id);
    }
    return httpRequest(`users/${id}`);
  },
  
  create: async (data) => {
    if (useNativeBridge) {
      const result = await nativeRequest('CreateUser', data);
      // 检查是否有错误
      if (result && result.error) {
        throw new Error(result.error);
      }
      return result;
    }
    const result = await httpRequest('users', { method: 'POST', body: data });
    // 检查 HTTP 响应中的错误
    if (result && result.error) {
      throw new Error(result.error);
    }
    return result;
  },
  
  update: async (id, data) => {
    if (useNativeBridge) {
      const result = await nativeRequest('UpdateUser', id, data);
      if (result && result.error) {
        throw new Error(result.error);
      }
      return result;
    }
    const result = await httpRequest(`users/${id}`, { method: 'PUT', body: data });
    if (result && result.error) {
      throw new Error(result.error);
    }
    return result;
  },
  
  delete: async (id) => {
    if (useNativeBridge) {
      return nativeRequest('DeleteUser', id);
    }
    return httpRequest(`users/${id}`, { method: 'DELETE' });
  },
};

// 任务 API
export const tasksApi = {
  getAll: async () => {
    const logPrefix = '[tasksApi.getAll]';
    try {
      console.log(`${logPrefix} ========== 开始获取任务数据 ==========`);
      console.log(`${logPrefix} 使用原生桥接: ${useNativeBridge}`);
      
      if (useNativeBridge) {
        console.log(`${logPrefix} 调用 nativeRequest('GetTasks')...`);
        const startTime = Date.now();
        
        const result = await nativeRequest('GetTasks');
        
        const duration = Date.now() - startTime;
        console.log(`${logPrefix} nativeRequest 完成，耗时: ${duration}ms`);
        console.log(`${logPrefix} 返回结果类型: ${typeof result}`);
        console.log(`${logPrefix} 是否为数组: ${Array.isArray(result)}`);
        console.log(`${logPrefix} 结果值:`, result);
        
        // 如果结果是字符串，尝试解析为 JSON
        if (typeof result === 'string') {
          console.log(`${logPrefix} 结果是字符串，尝试解析 JSON...`);
          try {
            const parsed = JSON.parse(result);
            console.log(`${logPrefix} JSON 解析成功，类型: ${typeof parsed}, 是否为数组: ${Array.isArray(parsed)}`);
            if (Array.isArray(parsed)) {
              console.log(`${logPrefix} 成功获取 ${parsed.length} 个任务`);
              if (parsed.length > 0) {
                console.log(`${logPrefix} 第一个任务示例:`, parsed[0]);
              }
              return parsed;
            }
            console.warn(`${logPrefix} 解析后的结果不是数组:`, parsed);
            return [];
          } catch (parseError) {
            console.error(`${logPrefix} JSON 解析失败:`, parseError);
            console.error(`${logPrefix} 原始字符串:`, result.substring(0, 200));
            return [];
          }
        }
        
        // 确保返回的是数组
        if (Array.isArray(result)) {
          console.log(`${logPrefix} 成功获取 ${result.length} 个任务`);
          if (result.length > 0) {
            console.log(`${logPrefix} 第一个任务示例:`, result[0]);
          }
          return result;
        }
        
        // 如果返回的是错误对象，记录并返回空数组
        if (result && typeof result === 'object' && result.error) {
          console.error(`${logPrefix} GetTasks 返回错误:`, result.error);
          console.error(`${logPrefix} 错误详情:`, result.details);
          return [];
        }
        
        // 如果返回的不是数组，尝试转换或返回空数组
        console.warn(`${logPrefix} GetTasks 返回非数组类型:`, result);
        console.warn(`${logPrefix} 返回类型: ${typeof result}`);
        return [];
      }
      
      console.log(`${logPrefix} 使用 HTTP API`);
      const httpResult = await httpRequest('tasks');
      console.log(`${logPrefix} HTTP API 返回结果:`, httpResult);
      return httpResult;
    } catch (error) {
      console.error(`${logPrefix} ========== 获取任务数据失败 ==========`);
      console.error(`${logPrefix} 错误:`, error);
      console.error(`${logPrefix} 错误消息:`, error.message);
      console.error(`${logPrefix} 错误堆栈:`, error.stack);
      return [];
    } finally {
      console.log(`${logPrefix} ========== 获取任务数据结束 ==========`);
    }
  },
  
  getById: async (id) => {
    if (useNativeBridge) {
      return nativeRequest('GetTask', id);
    }
    return httpRequest(`tasks/${id}`);
  },
  
  create: async (data) => {
    if (useNativeBridge) {
      const result = await nativeRequest('CreateTask', data);
      if (result && result.error) {
        throw new Error(result.error);
      }
      return result;
    }
    const result = await httpRequest('tasks', { method: 'POST', body: data });
    if (result && result.error) {
      throw new Error(result.error);
    }
    return result;
  },
  
  update: async (id, data) => {
    if (useNativeBridge) {
      const result = await nativeRequest('UpdateTask', id, data);
      if (result && result.error) {
        throw new Error(result.error);
      }
      return result;
    }
    const result = await httpRequest(`tasks/${id}`, { method: 'PUT', body: data });
    if (result && result.error) {
      throw new Error(result.error);
    }
    return result;
  },
  
  delete: async (id) => {
    if (useNativeBridge) {
      return nativeRequest('DeleteTask', id);
    }
    return httpRequest(`tasks/${id}`, { method: 'DELETE' });
  },
};

// 风险管理 API
export const risksApi = {
  getByProject: async (projectId) => {
    if (useNativeBridge) {
      const result = await nativeRequest('GetProjectRisks', projectId);
      return typeof result === 'string' ? JSON.parse(result) : result;
    }
    return httpRequest(`risks/project/${projectId}`);
  },
  
  getRiskValue: async (projectId) => {
    if (useNativeBridge) {
      const result = await nativeRequest('GetProjectRiskValue', projectId);
      return typeof result === 'string' ? JSON.parse(result) : result;
    }
    return httpRequest(`risks/project/${projectId}/risk-value`);
  },
  
  create: async (data) => {
    if (useNativeBridge) {
      const result = await nativeRequest('CreateRisk', data);
      if (result && result.error) {
        throw new Error(result.error);
      }
      return result;
    }
    const result = await httpRequest('risks', { method: 'POST', body: data });
    if (result && result.error) {
      throw new Error(result.error);
    }
    return result;
  },
  
  update: async (id, data) => {
    if (useNativeBridge) {
      const result = await nativeRequest('UpdateRisk', id, data);
      if (result && result.error) {
        throw new Error(result.error);
      }
      return result;
    }
    const result = await httpRequest(`risks/${id}`, { method: 'PUT', body: data });
    if (result && result.error) {
      throw new Error(result.error);
    }
    return result;
  },
  
  delete: async (id) => {
    if (useNativeBridge) {
      return nativeRequest('DeleteRisk', id);
    }
    return httpRequest(`risks/${id}`, { method: 'DELETE' });
  },
  
  createResponse: async (riskId, data) => {
    if (useNativeBridge) {
      const result = await nativeRequest('CreateRiskResponse', riskId, data);
      if (result && result.error) {
        throw new Error(result.error);
      }
      return result;
    }
    const result = await httpRequest(`risks/${riskId}/responses`, { method: 'POST', body: data });
    if (result && result.error) {
      throw new Error(result.error);
    }
    return result;
  },
  
  updateResponse: async (id, data) => {
    if (useNativeBridge) {
      const result = await nativeRequest('UpdateRiskResponse', id, data);
      if (result && result.error) {
        throw new Error(result.error);
      }
      return result;
    }
    const result = await httpRequest(`risks/responses/${id}`, { method: 'PUT', body: data });
    if (result && result.error) {
      throw new Error(result.error);
    }
    return result;
  },
  
  deleteResponse: async (id) => {
    if (useNativeBridge) {
      return nativeRequest('DeleteRiskResponse', id);
    }
    return httpRequest(`risks/responses/${id}`, { method: 'DELETE' });
  },
};

// 经验教训库 API
export const lessonLearnedApi = {
  getAll: async () => {
    if (useNativeBridge) {
      const result = await nativeRequest('GetLessonLearned');
      return typeof result === 'string' ? JSON.parse(result) : result;
    }
    return httpRequest('lessonlearned');
  },
  
  getById: async (id) => {
    if (useNativeBridge) {
      const result = await nativeRequest('GetLessonLearned', id);
      return typeof result === 'string' ? JSON.parse(result) : result;
    }
    return httpRequest(`lessonlearned/${id}`);
  },
  
  create: async (data) => {
    if (useNativeBridge) {
      const result = await nativeRequest('CreateLessonLearned', data);
      if (result && result.error) {
        throw new Error(result.error);
      }
      return result;
    }
    const result = await httpRequest('lessonlearned', { method: 'POST', body: data });
    if (result && result.error) {
      throw new Error(result.error);
    }
    return result;
  },
  
  update: async (id, data) => {
    if (useNativeBridge) {
      const result = await nativeRequest('UpdateLessonLearned', id, data);
      if (result && result.error) {
        throw new Error(result.error);
      }
      return result;
    }
    const result = await httpRequest(`lessonlearned/${id}`, { method: 'PUT', body: data });
    if (result && result.error) {
      throw new Error(result.error);
    }
    return result;
  },
  
  delete: async (id) => {
    if (useNativeBridge) {
      return nativeRequest('DeleteLessonLearned', id);
    }
    return httpRequest(`lessonlearned/${id}`, { method: 'DELETE' });
  },
};

// 数据库配置 API
export const databaseConfigApi = {
  getConfig: async () => {
    if (useNativeBridge) {
      const result = await nativeRequest('GetDatabaseConfig');
      return typeof result === 'string' ? JSON.parse(result) : result;
    }
    return httpRequest('config/database');
  },
  
  setPath: async (newPath) => {
    if (useNativeBridge) {
      const result = await nativeRequest('SetDatabasePath', newPath);
      return typeof result === 'string' ? JSON.parse(result) : result;
    }
    return httpRequest('config/database/path', {
      method: 'POST',
      body: { path: newPath }
    });
  },
  
  testConnection: async () => {
    if (useNativeBridge) {
      const result = await nativeRequest('TestDatabaseConnection');
      return typeof result === 'string' ? JSON.parse(result) : result;
    }
    return httpRequest('config/database/test');
  }
};

// 备份 API
export const backupApi = {
  create: async (backupName) => {
    if (useNativeBridge) {
      // 如果没有备份名称，传递null；否则传递JSON字符串
      const param = backupName ? JSON.stringify({ backupName }) : null;
      return nativeRequest('CreateBackup', param);
    }
    return httpRequest('backup/create', {
      method: 'POST',
      body: backupName ? { backupName } : {}
    });
  },

  getList: async () => {
    if (useNativeBridge) {
      const result = await nativeRequest('GetBackupList');
      return Array.isArray(result) ? result : [];
    }
    return httpRequest('backup/list');
  },

  restore: async (backupPath) => {
    if (useNativeBridge) {
      return nativeRequest('RestoreBackup', backupPath);
    }
    return httpRequest('backup/restore', {
      method: 'POST',
      body: { backupPath }
    });
  },

  delete: async (backupPath) => {
    if (useNativeBridge) {
      return nativeRequest('DeleteBackup', backupPath);
    }
    return httpRequest(`backup/${encodeURIComponent(backupPath)}`, {
      method: 'DELETE'
    });
  },

  exportToLocation: async () => {
    if (useNativeBridge) {
      return nativeRequest('ExportDatabaseToLocation');
    }
    return httpRequest('backup/export', { method: 'POST' });
  },

  importFromFile: async (fileName, fileData) => {
    if (useNativeBridge) {
      return nativeRequest('ImportDatabaseFromFile', fileName, fileData);
    }
    return httpRequest('backup/import', {
      method: 'POST',
      body: { fileName, fileData }
    });
  },
};

// 资产 API
export const assetsApi = {
  getAll: async () => {
    if (useNativeBridge) {
      const result = await nativeRequest('GetAssets');
      return Array.isArray(result) ? result : [];
    }
    return httpRequest('assets');
  },
  
  getById: async (id) => {
    if (useNativeBridge) {
      return nativeRequest('GetAsset', id);
    }
    return httpRequest(`assets/${id}`);
  },
  
  create: async (data) => {
    if (useNativeBridge) {
      const result = await nativeRequest('CreateAsset', data);
      if (result && result.error) {
        throw new Error(result.error);
      }
      return result;
    }
    const result = await httpRequest('assets', { method: 'POST', body: data });
    if (result && result.error) {
      throw new Error(result.error);
    }
    return result;
  },
  
  update: async (id, data) => {
    if (useNativeBridge) {
      const result = await nativeRequest('UpdateAsset', id, data);
      if (result && result.error) {
        throw new Error(result.error);
      }
      return result;
    }
    const result = await httpRequest(`assets/${id}`, { method: 'PUT', body: data });
    if (result && result.error) {
      throw new Error(result.error);
    }
    return result;
  },
  
  delete: async (id) => {
    if (useNativeBridge) {
      return nativeRequest('DeleteAsset', id);
    }
    return httpRequest(`assets/${id}`, { method: 'DELETE' });
  },
  
  createVersion: async (assetId, data) => {
    if (useNativeBridge) {
      const result = await nativeRequest('CreateAssetVersion', assetId, data);
      if (result && result.error) {
        throw new Error(result.error);
      }
      return result;
    }
    const result = await httpRequest(`assets/${assetId}/versions`, { method: 'POST', body: data });
    if (result && result.error) {
      throw new Error(result.error);
    }
    return result;
  },
  
  createProjectRelation: async (data) => {
    if (useNativeBridge) {
      const result = await nativeRequest('CreateAssetProjectRelation', data);
      if (result && result.error) {
        throw new Error(result.error);
      }
      return result;
    }
    const result = await httpRequest('assets/project-relation', { method: 'POST', body: data });
    if (result && result.error) {
      throw new Error(result.error);
    }
    return result;
  },
  
  getByProject: async (projectId) => {
    if (useNativeBridge) {
      const result = await nativeRequest('GetAssetsByProject', projectId);
      return Array.isArray(result) ? result : [];
    }
    return httpRequest(`assets/project/${projectId}`);
  },
};

// 资产健康度 API
export const assetHealthApi = {
  getHealth: async (assetId) => {
    if (useNativeBridge) {
      const result = await nativeRequest('GetAssetHealth', assetId);
      return typeof result === 'string' ? JSON.parse(result) : result;
    }
    return httpRequest(`assethealth/${assetId}`);
  },
  
  getHealthHistory: async (assetId, days = 30) => {
    if (useNativeBridge) {
      const result = await nativeRequest('GetAssetHealthHistory', assetId, JSON.stringify({ days }));
      return typeof result === 'string' ? JSON.parse(result) : result;
    }
    return httpRequest(`assethealth/${assetId}/history?days=${days}`);
  },
  
  getDashboard: async () => {
    if (useNativeBridge) {
      const result = await nativeRequest('GetAssetHealthDashboard');
      return typeof result === 'string' ? JSON.parse(result) : result;
    }
    return httpRequest('assethealth/dashboard');
  },
};

// 名言 API
export const quotesApi = {
  getAll: async () => {
    if (useNativeBridge) {
      const result = await nativeRequest('GetQuotes');
      return Array.isArray(result) ? result : [];
    }
    return httpRequest('quotes');
  },
  
  getRandom: async () => {
    if (useNativeBridge) {
      const result = await nativeRequest('GetRandomQuote');
      return typeof result === 'string' ? JSON.parse(result) : result;
    }
    return httpRequest('quotes/random');
  },
  
  getRandomBatch: async (count = 10) => {
    if (useNativeBridge) {
      const result = await nativeRequest('GetRandomQuotes', count.toString());
      return Array.isArray(result) ? result : [];
    }
    return httpRequest(`quotes/random/${count}`);
  },
  
  create: async (data) => {
    if (useNativeBridge) {
      const result = await nativeRequest('CreateQuote', data);
      if (result && result.error) {
        throw new Error(result.error);
      }
      return result;
    }
    const result = await httpRequest('quotes', { method: 'POST', body: data });
    if (result && result.error) {
      throw new Error(result.error);
    }
    return result;
  },
  
  createBatch: async (quotes) => {
    if (useNativeBridge) {
      const result = await nativeRequest('CreateQuotesBatch', JSON.stringify({ quotes }));
      if (result && result.error) {
        throw new Error(result.error);
      }
      return result;
    }
    const result = await httpRequest('quotes/batch', { method: 'POST', body: { quotes } });
    if (result && result.error) {
      throw new Error(result.error);
    }
    return result;
  },
};

export const productsApi = {
  getAll: async () => {
    if (useNativeBridge) {
      const result = await nativeRequest('GetProducts');
      return Array.isArray(result) ? result : [];
    }
    return httpRequest('products');
  },
  
  getById: async (id) => {
    if (useNativeBridge) {
      const result = await nativeRequest('GetProduct', id);
      // nativeRequest 已经解析了 JSON，直接返回
      const finalResult = typeof result === 'string' ? JSON.parse(result) : result;
      console.log('[productsApi.getById] 返回结果:', finalResult);
      console.log('[productsApi.getById] currentVersion:', finalResult?.currentVersion);
      return finalResult;
    }
    return httpRequest(`products/${id}`);
  },
  
  getStructure: async () => {
    if (useNativeBridge) {
      const result = await nativeRequest('GetProductsStructure');
      return Array.isArray(result) ? result : [];
    }
    return httpRequest('products/structure');
  },
  
  create: async (data) => {
    if (useNativeBridge) {
      const result = await nativeRequest('CreateProduct', JSON.stringify(data));
      if (result && result.error) {
        throw new Error(result.error);
      }
      return typeof result === 'string' ? JSON.parse(result) : result;
    }
    const result = await httpRequest('products', { method: 'POST', body: data });
    if (result && result.error) {
      throw new Error(result.error);
    }
    return result;
  },
  
  update: async (id, data) => {
    if (useNativeBridge) {
      const result = await nativeRequest('UpdateProduct', id, JSON.stringify(data));
      if (result && result.error) {
        throw new Error(result.error);
      }
      return typeof result === 'string' ? JSON.parse(result) : result;
    }
    const result = await httpRequest(`products/${id}`, { method: 'PUT', body: data });
    if (result && result.error) {
      throw new Error(result.error);
    }
    return result;
  },
  
  delete: async (id) => {
    if (useNativeBridge) {
      const result = await nativeRequest('DeleteProduct', id);
      if (result && result.error) {
        throw new Error(result.error);
      }
      return typeof result === 'string' ? JSON.parse(result) : result;
    }
    const result = await httpRequest(`products/${id}`, { method: 'DELETE' });
    if (result && result.error) {
      throw new Error(result.error);
    }
    return result;
  },
  
  getVersions: async () => {
    if (useNativeBridge) {
      const result = await nativeRequest('GetProductVersions');
      return Array.isArray(result) ? result : [];
    }
    return httpRequest('products/versions');
  },

  createVersion: async (productId, data) => {
    if (useNativeBridge) {
      const result = await nativeRequest('CreateProductVersion', productId, JSON.stringify(data));
      if (result && result.error) {
        throw new Error(result.error);
      }
      return typeof result === 'string' ? JSON.parse(result) : result;
    }
    const result = await httpRequest(`products/${productId}/versions`, { method: 'POST', body: data });
    if (result && result.error) {
      throw new Error(result.error);
    }
    return result;
  },

  updateVersion: async (id, data) => {
    if (useNativeBridge) {
      const result = await nativeRequest('UpdateProductVersion', id, JSON.stringify(data));
      if (result && result.error) {
        throw new Error(result.error);
      }
      return typeof result === 'string' ? JSON.parse(result) : result;
    }
    const result = await httpRequest(`products/versions/${id}`, { method: 'PUT', body: data });
    if (result && result.error) {
      throw new Error(result.error);
    }
    return result;
  },

  deleteVersion: async (id) => {
    if (useNativeBridge) {
      const result = await nativeRequest('DeleteProductVersion', id);
      if (result && result.error) {
        throw new Error(result.error);
      }
      return typeof result === 'string' ? JSON.parse(result) : result;
    }
    const result = await httpRequest(`products/versions/${id}`, { method: 'DELETE' });
    if (result && result.error) {
      throw new Error(result.error);
    }
    return result;
  },
  
  getAnalytics: async () => {
    if (useNativeBridge) {
      const result = await nativeRequest('GetProductAnalytics');
      return typeof result === 'string' ? JSON.parse(result) : result;
    }
    return httpRequest('products/analytics');
  },

  // 模块管理
  createModule: async (productId, data) => {
    if (useNativeBridge) {
      const result = await nativeRequest('CreateProductModule', productId, JSON.stringify(data));
      if (result && result.error) {
        throw new Error(result.error);
      }
      return typeof result === 'string' ? JSON.parse(result) : result;
    }
    const result = await httpRequest(`products/${productId}/modules`, { method: 'POST', body: data });
    if (result && result.error) {
      throw new Error(result.error);
    }
    return result;
  },

  updateModule: async (id, data) => {
    if (useNativeBridge) {
      const result = await nativeRequest('UpdateProductModule', id, JSON.stringify(data));
      if (result && result.error) {
        throw new Error(result.error);
      }
      return typeof result === 'string' ? JSON.parse(result) : result;
    }
    const result = await httpRequest(`products/modules/${id}`, { method: 'PUT', body: data });
    if (result && result.error) {
      throw new Error(result.error);
    }
    return result;
  },

  deleteModule: async (id) => {
    if (useNativeBridge) {
      const result = await nativeRequest('DeleteProductModule', id);
      if (result && result.error) {
        throw new Error(result.error);
      }
      return typeof result === 'string' ? JSON.parse(result) : result;
    }
    const result = await httpRequest(`products/modules/${id}`, { method: 'DELETE' });
    if (result && result.error) {
      throw new Error(result.error);
    }
    return result;
  },

  // 子模块管理
  createSubModule: async (moduleId, data) => {
    if (useNativeBridge) {
      const result = await nativeRequest('CreateProductSubModule', moduleId, JSON.stringify(data));
      if (result && result.error) {
        throw new Error(result.error);
      }
      return typeof result === 'string' ? JSON.parse(result) : result;
    }
    const result = await httpRequest(`products/modules/${moduleId}/submodules`, { method: 'POST', body: data });
    if (result && result.error) {
      throw new Error(result.error);
    }
    return result;
  },

  updateSubModule: async (id, data) => {
    if (useNativeBridge) {
      const result = await nativeRequest('UpdateProductSubModule', id, JSON.stringify(data));
      if (result && result.error) {
        throw new Error(result.error);
      }
      return typeof result === 'string' ? JSON.parse(result) : result;
    }
    const result = await httpRequest(`products/submodules/${id}`, { method: 'PUT', body: data });
    if (result && result.error) {
      throw new Error(result.error);
    }
    return result;
  },

  deleteSubModule: async (id) => {
    if (useNativeBridge) {
      const result = await nativeRequest('DeleteProductSubModule', id);
      if (result && result.error) {
        throw new Error(result.error);
      }
      return typeof result === 'string' ? JSON.parse(result) : result;
    }
    const result = await httpRequest(`products/submodules/${id}`, { method: 'DELETE' });
    if (result && result.error) {
      throw new Error(result.error);
    }
    return result;
  },

  // 功能管理
  createFunction: async (subModuleId, data) => {
    if (useNativeBridge) {
      const result = await nativeRequest('CreateProductFunction', subModuleId, JSON.stringify(data));
      if (result && result.error) {
        throw new Error(result.error);
      }
      return typeof result === 'string' ? JSON.parse(result) : result;
    }
    const result = await httpRequest(`products/submodules/${subModuleId}/functions`, { method: 'POST', body: data });
    if (result && result.error) {
      throw new Error(result.error);
    }
    return result;
  },

  updateFunction: async (id, data) => {
    if (useNativeBridge) {
      const result = await nativeRequest('UpdateProductFunction', id, JSON.stringify(data));
      if (result && result.error) {
        throw new Error(result.error);
      }
      return typeof result === 'string' ? JSON.parse(result) : result;
    }
    const result = await httpRequest(`products/functions/${id}`, { method: 'PUT', body: data });
    if (result && result.error) {
      throw new Error(result.error);
    }
    return result;
  },

  deleteFunction: async (id) => {
    if (useNativeBridge) {
      const result = await nativeRequest('DeleteProductFunction', id);
      if (result && result.error) {
        throw new Error(result.error);
      }
      return typeof result === 'string' ? JSON.parse(result) : result;
    }
    const result = await httpRequest(`products/functions/${id}`, { method: 'DELETE' });
    if (result && result.error) {
      throw new Error(result.error);
    }
    return result;
  },

  // 功能关联管理
  addFunctionAsset: async (functionId, data) => {
    if (useNativeBridge) {
      const result = await nativeRequest('AddFunctionAsset', functionId, JSON.stringify(data));
      if (result && result.error) {
        throw new Error(result.error);
      }
      return typeof result === 'string' ? JSON.parse(result) : result;
    }
    const result = await httpRequest(`products/functions/${functionId}/assets`, { method: 'POST', body: data });
    if (result && result.error) {
      throw new Error(result.error);
    }
    return result;
  },

  removeFunctionAsset: async (functionId, assetId) => {
    if (useNativeBridge) {
      const result = await nativeRequest('RemoveFunctionAsset', functionId, assetId);
      if (result && result.error) {
        throw new Error(result.error);
      }
      return typeof result === 'string' ? JSON.parse(result) : result;
    }
    const result = await httpRequest(`products/functions/${functionId}/assets/${assetId}`, { method: 'DELETE' });
    if (result && result.error) {
      throw new Error(result.error);
    }
    return result;
  },

  addFunctionEngineer: async (functionId, data) => {
    if (useNativeBridge) {
      const result = await nativeRequest('AddFunctionEngineer', functionId, JSON.stringify(data));
      if (result && result.error) {
        throw new Error(result.error);
      }
      return typeof result === 'string' ? JSON.parse(result) : result;
    }
    const result = await httpRequest(`products/functions/${functionId}/engineers`, { method: 'POST', body: data });
    if (result && result.error) {
      throw new Error(result.error);
    }
    return result;
  },

  removeFunctionEngineer: async (functionId, engineerId) => {
    if (useNativeBridge) {
      const result = await nativeRequest('RemoveFunctionEngineer', functionId, engineerId);
      if (result && result.error) {
        throw new Error(result.error);
      }
      return typeof result === 'string' ? JSON.parse(result) : result;
    }
    const result = await httpRequest(`products/functions/${functionId}/engineers/${engineerId}`, { method: 'DELETE' });
    if (result && result.error) {
      throw new Error(result.error);
    }
    return result;
  },

  addFunctionCustomer: async (functionId, data) => {
    if (useNativeBridge) {
      const result = await nativeRequest('AddFunctionCustomer', functionId, JSON.stringify(data));
      if (result && result.error) {
        throw new Error(result.error);
      }
      return typeof result === 'string' ? JSON.parse(result) : result;
    }
    const result = await httpRequest(`products/functions/${functionId}/customers`, { method: 'POST', body: data });
    if (result && result.error) {
      throw new Error(result.error);
    }
    return result;
  },

  removeFunctionCustomer: async (functionId, customerId) => {
    if (useNativeBridge) {
      const result = await nativeRequest('RemoveFunctionCustomer', functionId, customerId);
      if (result && result.error) {
        throw new Error(result.error);
      }
      return typeof result === 'string' ? JSON.parse(result) : result;
    }
    const result = await httpRequest(`products/functions/${functionId}/customers/${customerId}`, { method: 'DELETE' });
    if (result && result.error) {
      throw new Error(result.error);
    }
    return result;
  },

  addFunctionTask: async (functionId, data) => {
    if (useNativeBridge) {
      const result = await nativeRequest('AddFunctionTask', functionId, JSON.stringify(data));
      if (result && result.error) {
        throw new Error(result.error);
      }
      return typeof result === 'string' ? JSON.parse(result) : result;
    }
    const result = await httpRequest(`products/functions/${functionId}/tasks`, { method: 'POST', body: data });
    if (result && result.error) {
      throw new Error(result.error);
    }
    return result;
  },

  removeFunctionTask: async (functionId, taskId) => {
    if (useNativeBridge) {
      const result = await nativeRequest('RemoveFunctionTask', functionId, taskId);
      if (result && result.error) {
        throw new Error(result.error);
      }
      return typeof result === 'string' ? JSON.parse(result) : result;
    }
    const result = await httpRequest(`products/functions/${functionId}/tasks/${taskId}`, { method: 'DELETE' });
    if (result && result.error) {
      throw new Error(result.error);
    }
    return result;
  },
};

// 报告 API
export const reportsApi = {
  getPersonReport: async (personName, startDate, endDate) => {
    if (useNativeBridge) {
      const reportData = JSON.stringify({ personName, startDate, endDate });
      const result = await nativeRequest('GetPersonReport', reportData);
      if (result && result.error) {
        throw new Error(result.error);
      }
      return typeof result === 'string' ? JSON.parse(result) : result;
    }
    const result = await httpRequest('reports/person-report', {
      method: 'POST',
      body: { personName, startDate, endDate }
    });
    if (result && result.error) {
      throw new Error(result.error);
    }
    return result;
  },

  getEngineerReport: async (engineerId, startDate, endDate) => {
    if (useNativeBridge) {
      const reportData = JSON.stringify({ engineerId, startDate, endDate });
      const result = await nativeRequest('GetEngineerReport', reportData);
      if (result && result.error) {
        throw new Error(result.error);
      }
      return typeof result === 'string' ? JSON.parse(result) : result;
    }
    const result = await httpRequest('reports/engineer-report', {
      method: 'POST',
      body: { engineerId, startDate, endDate }
    });
    if (result && result.error) {
      throw new Error(result.error);
    }
    return result;
  },
};

// 相关方 API
export const stakeholdersApi = {
  getAll: async () => {
    if (useNativeBridge) {
      const result = await nativeRequest('GetStakeholders');
      if (result && result.error) {
        throw new Error(result.error);
      }
      // 处理返回的数据格式
      let data = typeof result === 'string' ? JSON.parse(result) : result;
      // 如果返回的是包装对象，提取实际数据
      if (data && !Array.isArray(data)) {
        if (Array.isArray(data.value)) {
          data = data.value;
        } else if (Array.isArray(data.result)) {
          data = data.result;
        }
      }
      return Array.isArray(data) ? data : [];
    }
    const result = await httpRequest('stakeholders', { method: 'GET' });
    if (result && result.error) {
      throw new Error(result.error);
    }
    return Array.isArray(result) ? result : [];
  },
};

// 通用 API 对象（用于直接 HTTP 请求）
export const api = {
  get: async (endpoint) => {
    const url = `${API_BASE_URL}${endpoint}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    return response;
  },
  
  post: async (endpoint, data) => {
    const url = `${API_BASE_URL}${endpoint}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    return response;
  },
  
  put: async (endpoint, data) => {
    const url = `${API_BASE_URL}${endpoint}`;
    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    return response;
  },
  
  delete: async (endpoint) => {
    const url = `${API_BASE_URL}${endpoint}`;
    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    return response;
  },
};