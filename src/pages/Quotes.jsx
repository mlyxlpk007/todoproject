import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '@/components/ui/use-toast';
import { Grid, List, RefreshCw, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { quotesApi } from '@/lib/api';

// 简单的随机数生成器
class Random {
  constructor(seed = Date.now()) {
    this.seed = seed;
  }

  next() {
    this.seed = (this.seed * 9301 + 49297) % 233280;
    return this.seed / 233280;
  }

  nextInt(max) {
    return Math.floor(this.next() * max);
  }

  nextFloat() {
    return this.next();
  }
}

const Quotes = () => {
  const { toast } = useToast();
  const [quotes, setQuotes] = useState([]);
  const [displayedQuotes, setDisplayedQuotes] = useState([]);
  const [viewMode, setViewMode] = useState('bubble'); // bubble 或 list
  const [loading, setLoading] = useState(true);
  const containerRef = useRef(null);
  const bubbleCount = 15; // 同时显示的气泡数量（增加以铺满区域）

  useEffect(() => {
    loadQuotes();
  }, []);

  useEffect(() => {
    if (viewMode === 'bubble' && quotes.length > 0) {
      initializeBubbles();
    }
  }, [viewMode, quotes]);

  const loadQuotes = async () => {
    try {
      setLoading(true);
      const data = await quotesApi.getAll();
      setQuotes(data);
      if (viewMode === 'bubble' && data.length > 0) {
        initializeBubbles();
      }
    } catch (error) {
      console.error('加载名言失败:', error);
      toast({ title: "加载名言失败", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  // 计算气泡的实际渲染尺寸（包括padding、border等）
  const getBubbleActualSize = (bubbleSize, quoteText = '', categoryText = '') => {
    // 基础尺寸
    const baseWidth = 200;
    const baseHeight = 100;
    const sizeMultiplier = bubbleSize;
    
    // 估算文本宽度（中文字符约等于字体大小的1倍，英文约0.6倍）
    const fontSize = 0.9 + bubbleSize * 0.1; // rem
    const fontSizePx = fontSize * 16; // 转换为px
    const charWidth = fontSizePx; // 中文字符宽度
    const maxTextWidth = Math.max(180, 250 + bubbleSize * 50); // 最大宽度限制
    const minTextWidth = 180; // 最小宽度
    
    // 估算文本行数（考虑换行）
    const textLength = quoteText.length || 20; // 默认20个字符
    const charsPerLine = Math.floor(maxTextWidth / charWidth);
    const textLines = Math.max(1, Math.ceil(textLength / charsPerLine));
    
    // 计算实际宽度（文本宽度 + padding）
    const paddingX = 16 * 2; // 左右padding各16px
    const borderWidth = 2; // border宽度
    const actualWidth = Math.min(maxTextWidth, Math.max(minTextWidth, textLength * charWidth / charsPerLine)) + paddingX + borderWidth;
    
    // 计算实际高度（行数 * 行高 + padding + category高度）
    const lineHeight = fontSizePx * 1.6; // 行高
    const paddingY = 16 * 2; // 上下padding各16px
    const categoryHeight = categoryText ? fontSizePx * 0.75 + 8 : 0; // category高度
    const actualHeight = textLines * lineHeight + paddingY + categoryHeight + borderWidth;
    
    return {
      width: actualWidth,
      height: actualHeight,
      halfWidth: actualWidth / 2,
      halfHeight: actualHeight / 2
    };
  };

  // 计算气泡的安全边界（虚拟空气墙）
  // 基于中心点 + 半尺寸的边界计算
  const getBubbleBounds = (bubbleSize, containerWidth, containerHeight, quoteText = '', categoryText = '') => {
    if (!containerWidth || !containerHeight) {
      return { minX: 5, maxX: 95, minY: 5, maxY: 95 };
    }
    
    // 获取气泡实际渲染尺寸
    const bubbleSizeInfo = getBubbleActualSize(bubbleSize, quoteText, categoryText);
    const halfWidth = bubbleSizeInfo.halfWidth;
    const halfHeight = bubbleSizeInfo.halfHeight;
    
    // 虚拟空气墙：确保气泡边缘距离容器边缘至少30px
    const wallPadding = 10;
    
    // 转换为百分比，基于中心点 + 半尺寸
    const halfWidthPercentX = (halfWidth / containerWidth) * 100;
    const halfHeightPercentY = (halfHeight / containerHeight) * 100;
    const paddingPercentX = (220 / containerWidth) * 100;
    const paddingPercentY = (80 / containerHeight) * 100;
    
    // 中心点的安全范围 = 半尺寸 + 边距
    const minX = halfWidthPercentX + paddingPercentX;
    const maxX = 100 - (halfWidthPercentX + paddingPercentX);
    const minY = halfHeightPercentY + paddingPercentY;
    const maxY = 100 - (halfHeightPercentY + paddingPercentY);
    
    return {
      minX: Math.max(0, minX),
      maxX: Math.min(100, maxX),
      minY: Math.max(0, minY),
      maxY: Math.min(100, maxY),
      halfWidth: halfWidthPercentX,
      halfHeight: halfHeightPercentY,
      actualWidth: bubbleSizeInfo.width,
      actualHeight: bubbleSizeInfo.height
    };
  };

  // 检查位置是否与现有气泡重叠
  const isPositionOverlapping = (x, y, size, existingBubbles, containerWidth, containerHeight, quoteText = '', categoryText = '', strict = true) => {
    if (existingBubbles.length === 0) return false;
    
    // 获取气泡实际尺寸
    const bubbleSizeInfo = getBubbleActualSize(size, quoteText, categoryText);
    const halfWidth = bubbleSizeInfo.halfWidth;
    const halfHeight = bubbleSizeInfo.halfHeight;
    const bubbleRadius = Math.max(halfWidth, halfHeight);
    
    // 根据严格程度调整最小间距
    const minDistance = strict ? bubbleRadius * 1.4 : bubbleRadius * 1.2;
    
    for (const bubble of existingBubbles) {
      // 获取现有气泡的实际尺寸
      const existingSizeInfo = getBubbleActualSize(bubble.size, bubble.quote || '', bubble.category || '');
      const existingRadius = Math.max(existingSizeInfo.halfWidth, existingSizeInfo.halfHeight);
      
      const existingX = (bubble.x / 100) * containerWidth;
      const existingY = (bubble.y / 100) * containerHeight;
      const newX = (x / 100) * containerWidth;
      const newY = (y / 100) * containerHeight;
      
      const distance = Math.sqrt(
        Math.pow(newX - existingX, 2) + Math.pow(newY - existingY, 2)
      );
      
      if (distance < minDistance + existingRadius) {
        return true;
      }
    }
    return false;
  };

  const initializeBubbles = () => {
    if (quotes.length === 0) return;
    
    // 等待容器渲染完成
    const tryInitialize = () => {
      if (!containerRef.current) {
        setTimeout(tryInitialize, 50);
        return;
      }
      
      const containerWidth = containerRef.current.clientWidth;
      const containerHeight = containerRef.current.clientHeight;
      
      if (containerWidth === 0 || containerHeight === 0) {
        setTimeout(tryInitialize, 50);
        return;
      }
      
      const random = new Random();
      const initialQuotes = [];
      const usedIndices = new Set();
      const targetCount = Math.min(bubbleCount, quotes.length);
      
      console.log(`[Quotes] 初始化气泡，目标数量: ${targetCount}, 可用名言: ${quotes.length}`);
      
      // 使用完全随机分布，避免网格布局的规律性
      for (let i = 0; i < targetCount; i++) {
        let index;
        do {
          index = random.nextInt(quotes.length);
        } while (usedIndices.has(index) && usedIndices.size < quotes.length);
        
        usedIndices.add(index);
        const quote = quotes[index];
        
        // 计算气泡大小（像素），使用更大的变化范围
        const bubbleSize = random.nextFloat() * 0.5 + 0.7; // 0.7-1.2倍
        
        // 获取该气泡的安全边界（虚拟空气墙）- 传入实际文本内容
        const bounds = getBubbleBounds(bubbleSize, containerWidth, containerHeight, quote.quote, quote.category);
        
        // 完全随机分布，避免规律性
        let x, y;
        let attempts = 0;
        const maxAttempts = 100; // 增加尝试次数
        
        do {
          // 完全随机位置，不使用网格
          x = random.nextFloat() * (bounds.maxX - bounds.minX) + bounds.minX;
          y = random.nextFloat() * (bounds.maxY - bounds.minY) + bounds.minY;
          
          // 确保在边界内
          x = Math.max(bounds.minX, Math.min(bounds.maxX, x));
          y = Math.max(bounds.minY, Math.min(bounds.maxY, y));
          
          attempts++;
          
          // 根据尝试次数调整重叠检测的严格程度
          const isStrict = attempts < maxAttempts * 0.7; // 前70%的尝试使用严格检测
          const isOverlapping = isPositionOverlapping(x, y, bubbleSize, initialQuotes, containerWidth, containerHeight, quote.quote, quote.category, isStrict);
          
          if (!isOverlapping || attempts >= maxAttempts) {
            // 没有重叠或达到最大尝试次数，使用当前位置
            break;
          }
        } while (attempts < maxAttempts);
        
        initialQuotes.push({
          ...quote,
          x: x,
          y: y,
          size: bubbleSize,
          rotation: random.nextFloat() * 10 - 5, // -5到5度
          id: `bubble-${i}-${Date.now()}`,
          vx: (random.nextFloat() - 0.5) * 0.12, // 初始速度 x（减小速度，避免碰撞）
          vy: (random.nextFloat() - 0.5) * 0.12, // 初始速度 y
          bounds: bounds, // 保存边界信息
          containerWidth: containerWidth,
          containerHeight: containerHeight
        });
      }
      
      console.log(`[Quotes] 成功初始化 ${initialQuotes.length} 个气泡`);
      setDisplayedQuotes(initialQuotes);
    };
    
    tryInitialize();
  };

  const handleBubbleClick = async (bubbleId) => {
    // 延迟移除被点击的气泡，让破裂动画完成
    setTimeout(() => {
      setDisplayedQuotes(prev => prev.filter(b => b.id !== bubbleId));
    }, 300);
    
    // 获取一个新的随机名言
    try {
      const newQuote = await quotesApi.getRandom();
      if (newQuote && containerRef.current) {
        const random = new Random();
        const containerWidth = containerRef.current.clientWidth;
        const containerHeight = containerRef.current.clientHeight;
        
        // 计算气泡大小
        const bubbleSize = random.nextFloat() * 0.5 + 0.7;
        
        // 获取该气泡的安全边界（虚拟空气墙）- 传入实际文本内容
        const bounds = getBubbleBounds(bubbleSize, containerWidth, containerHeight, newQuote.quote, newQuote.category);
        
        // 确保新气泡不会与现有气泡重叠太多
        let attempts = 0;
        let x, y;
        const currentQuotes = displayedQuotes.filter(b => b.id !== bubbleId);
        do {
          x = random.nextFloat() * (bounds.maxX - bounds.minX) + bounds.minX;
          y = random.nextFloat() * (bounds.maxY - bounds.minY) + bounds.minY;
          attempts++;
        } while (attempts < 20 && isOverlapping(x, y, currentQuotes));
        
        const newBubble = {
          ...newQuote,
          x: x,
          y: y,
          size: bubbleSize,
          rotation: random.nextFloat() * 10 - 5,
          id: `bubble-${Date.now()}-${Math.random()}`,
          vx: (random.nextFloat() - 0.5) * 0.15,
          vy: (random.nextFloat() - 0.5) * 0.15,
          bounds: bounds,
          containerWidth: containerWidth,
          containerHeight: containerHeight
        };
        
        // 延迟添加新气泡，让旧气泡先消失
        setTimeout(() => {
          setDisplayedQuotes(prev => [...prev.filter(b => b.id !== bubbleId), newBubble]);
        }, 350);
      }
    } catch (error) {
      console.error('获取新名言失败:', error);
    }
  };

  const isOverlapping = (x, y, existingBubbles) => {
    // 简单的重叠检测，检查是否在20%范围内有现有气泡
    return existingBubbles.some(bubble => {
      const distance = Math.sqrt(
        Math.pow(x - bubble.x, 2) + Math.pow(y - bubble.y, 2)
      );
      return distance < 20;
    });
  };

  const getBubbleColor = (index) => {
    const colors = [
      'border-blue-300/40',
      'border-purple-300/40',
      'border-pink-300/40',
      'border-indigo-300/40',
      'border-cyan-300/40',
      'border-teal-300/40',
    ];
    return colors[index % colors.length];
  };

  const getBubbleGradientColor = (index) => {
    const gradients = [
      'rgba(59, 130, 246, 0.3)', // blue - 增加不透明度
      'rgba(168, 85, 247, 0.3)', // purple
      'rgba(236, 72, 153, 0.3)', // pink
      'rgba(99, 102, 241, 0.3)', // indigo
      'rgba(6, 182, 212, 0.3)', // cyan
      'rgba(20, 184, 166, 0.3)', // teal
    ];
    return gradients[index % gradients.length];
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-gray-400">加载中...</div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="w-full">
        {/* 页面标题和视图切换 */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2 flex items-center">
              <Sparkles className="w-8 h-8 mr-3 text-indigo-400" />
              管理泡泡
            </h1>
            <p className="text-gray-400">点击气泡查看新名言，切换视图查看所有名言</p>
          </div>
          <div className="flex gap-2">
            <Button
              variant={viewMode === 'bubble' ? 'default' : 'outline'}
              onClick={() => setViewMode('bubble')}
              className={viewMode === 'bubble' ? 'bg-indigo-600 hover:bg-indigo-700' : ''}
            >
              <Grid className="w-4 h-4 mr-2" />
              气泡视图
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'outline'}
              onClick={() => setViewMode('list')}
              className={viewMode === 'list' ? 'bg-indigo-600 hover:bg-indigo-700' : ''}
            >
              <List className="w-4 h-4 mr-2" />
              列表视图
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                if (viewMode === 'bubble') {
                  initializeBubbles();
                } else {
                  loadQuotes();
                }
              }}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              刷新
            </Button>
          </div>
        </div>

        {/* 气泡视图 */}
        {viewMode === 'bubble' ? (
          <div
            ref={containerRef}
            className="relative w-full h-[calc(100vh-200px)] min-h-[600px] bg-gradient-to-br from-blue-900/40 via-cyan-900/30 to-purple-900/40 rounded-xl overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, rgba(30, 58, 138, 0.4) 0%, rgba(14, 116, 144, 0.3) 50%, rgba(88, 28, 135, 0.4) 100%)',
              width: '100%',
              maxWidth: '100%',
              backdropFilter: 'blur(1px)',
              WebkitBackdropFilter: 'blur(1px)'
            }}
          >
            {/* 透明容器层 - 限制气泡绘制区域 */}
            <div
              className="absolute inset-0 overflow-hidden"
              style={{
                left: '0',
                top: '0',
                right: '0',
                bottom: '0',
                pointerEvents: 'none' // 允许点击穿透到气泡
              }}
            >
              <AnimatePresence mode="popLayout">
              {displayedQuotes.map((bubble, index) => {
                // 获取容器尺寸
                const containerWidth = containerRef.current?.clientWidth || bubble.containerWidth || 1000;
                const containerHeight = containerRef.current?.clientHeight || bubble.containerHeight || 600;
                
                // 重新计算边界（确保使用最新的容器尺寸和实际文本内容）
                const bounds = getBubbleBounds(bubble.size, containerWidth, containerHeight, bubble.quote, bubble.category);
                
                // 确保当前位置在安全边界内（基于中心点）
                let centerX = bubble.x; // 中心点X（百分比）
                let centerY = bubble.y; // 中心点Y（百分比）
                
                // 边界检查：确保中心点 + 半尺寸不会超出容器
                centerX = Math.max(bounds.minX, Math.min(bounds.maxX, centerX));
                centerY = Math.max(bounds.minY, Math.min(bounds.maxY, centerY));
                
                // 计算移动范围，确保不超出空气墙
                const availableRangeX = Math.max(0, bounds.maxX - bounds.minX);
                const availableRangeY = Math.max(0, bounds.maxY - bounds.minY);
                const moveRangeX = Math.min(1.5, availableRangeX * 0.1);
                const moveRangeY = Math.min(1.5, availableRangeY * 0.1);
                
                // 计算移动目标位置（中心点）
                const moveX = bubble.vx || (Math.random() - 0.5) * moveRangeX;
                const moveY = bubble.vy || (Math.random() - 0.5) * moveRangeY;
                
                let targetX = centerX + moveX;
                let targetY = centerY + moveY;
                
                // 严格限制目标位置（中心点必须在安全范围内）
                targetX = Math.max(bounds.minX, Math.min(bounds.maxX, targetX));
                targetY = Math.max(bounds.minY, Math.min(bounds.maxY, targetY));
                
                const moveDuration = 18 + Math.random() * 12; // 18-30秒，更慢的移动
                const opacityDuration = 3 + Math.random() * 2; // 3-5秒
                
                // 将中心点百分比转换为像素位置
                const centerXPx = (centerX / 100) * containerWidth;
                const centerYPx = (centerY / 100) * containerHeight;
                const targetXPx = (targetX / 100) * containerWidth;
                const targetYPx = (targetY / 100) * containerHeight;
                
                return (
                  <motion.div
                    key={bubble.id}
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{
                      opacity: [0.6, 0.85, 0.6],
                      scale: bubble.size,
                      x: [centerXPx, targetXPx, centerXPx],
                      y: [centerYPx, targetYPx, centerYPx],
                      rotate: bubble.rotation
                    }}
                    exit={{
                      opacity: [0.85, 0.5, 0],
                      scale: [bubble.size, bubble.size * 1.4, 0],
                      rotate: bubble.rotation + (Math.random() > 0.5 ? 180 : -180),
                      x: centerXPx + (Math.random() - 0.5) * (containerWidth * 0.1),
                      y: centerYPx + (Math.random() - 0.5) * (containerHeight * 0.1)
                    }}
                    transition={{
                      opacity: {
                        duration: opacityDuration,
                        repeat: Infinity,
                        ease: "easeInOut"
                      },
                      x: {
                        duration: moveDuration,
                        repeat: Infinity,
                        repeatType: "reverse",
                        ease: "easeInOut"
                      },
                      y: {
                        duration: moveDuration * 0.9,
                        repeat: Infinity,
                        repeatType: "reverse",
                        ease: "easeInOut"
                      },
                      scale: {
                        duration: 0.4,
                        type: "spring",
                        stiffness: 150
                      },
                      rotate: {
                        duration: 0.4
                      },
                      exit: {
                        duration: 0.3,
                        ease: "easeIn"
                      }
                    }}
                    className="absolute cursor-pointer"
                    style={{
                      left: 0,
                      top: 0,
                      transform: 'translate(-50%, -50%)',
                      maxWidth: `${250 + bubble.size * 50}px`,
                      minWidth: '180px',
                      pointerEvents: 'auto' // 恢复点击事件，因为父容器设置了 pointerEvents: 'none'
                    }}
                    onClick={() => handleBubbleClick(bubble.id)}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                {/* 微信风格气泡主体 */}
                <div
                  className={`rounded-2xl ${getBubbleColor(index)} border backdrop-blur-md flex flex-col p-4 relative`}
                  style={{
                    background: `linear-gradient(135deg, 
                      rgba(255, 255, 255, 0.25), 
                      ${getBubbleGradientColor(index)}, 
                      rgba(0, 0, 0, 0.15)
                    )`,
                    backdropFilter: 'blur(12px) saturate(180%)',
                    WebkitBackdropFilter: 'blur(12px) saturate(180%)',
                    backgroundColor: 'rgba(30, 30, 40, 0.7)',
                    boxShadow: `
                      0 4px 20px rgba(0, 0, 0, 0.4),
                      0 0 0 1px rgba(255, 255, 255, 0.15),
                      inset 0 1px 0 rgba(255, 255, 255, 0.2)
                    `,
                    fontSize: `${0.9 + bubble.size * 0.1}rem`,
                    lineHeight: '1.6',
                    wordBreak: 'break-word',
                    width: 'auto',
                    display: 'inline-block',
                    borderColor: 'rgba(255, 255, 255, 0.2)'
                  }}
                >
                  <div 
                    className="font-medium relative z-10 leading-relaxed"
                    style={{
                      color: '#ffffff',
                      textShadow: '0 1px 3px rgba(0, 0, 0, 0.5), 0 0 10px rgba(0, 0, 0, 0.3)',
                      fontWeight: '500'
                    }}
                  >
                    {bubble.quote}
                  </div>
                  {bubble.category && (
                    <div 
                      className="text-xs mt-2 relative z-10 text-right"
                      style={{
                        color: '#ffffff',
                        textShadow: '0 1px 2px rgba(0, 0, 0, 0.4)',
                        fontWeight: '400'
                      }}
                    >
                      {bubble.category}
                    </div>
                  )}
                </div>
              </motion.div>
                );
              })}
              </AnimatePresence>
            </div>
            {displayedQuotes.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center text-gray-500">
                <div className="text-center">
                  <Sparkles className="w-16 h-16 mx-auto mb-4 text-gray-600" />
                  <p>暂无名言，请先添加名言数据</p>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* 列表视图 */
          <div className="bg-gray-800/50 rounded-lg p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {quotes.map((quote, index) => (
                <motion.div
                  key={quote.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="bg-gray-700/50 rounded-lg p-4 border border-gray-600 hover:border-indigo-500 transition-colors"
                >
                  <div className="font-medium text-white mb-2">
                    {quote.quote}
                  </div>
                  {quote.category && (
                    <div className="text-xs text-gray-400 mt-2">
                      {quote.category}
                    </div>
                  )}
                  <div className="text-xs text-gray-500 mt-2">
                    显示次数: {quote.displayCount}
                  </div>
                </motion.div>
              ))}
            </div>
            {quotes.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                <Sparkles className="w-16 h-16 mx-auto mb-4 text-gray-600" />
                <p>暂无名言，请先添加名言数据</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Quotes;
