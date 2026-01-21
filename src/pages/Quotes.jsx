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
  const bubbleCount = 15; // 同时显示的气泡数量

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

  // 计算气泡的安全边界（虚拟空气墙）
  const getBubbleBounds = (bubbleSize) => {
    if (!containerRef.current) {
      return { minX: 10, maxX: 90, minY: 10, maxY: 90 };
    }
    
    const containerWidth = containerRef.current.clientWidth;
    const containerHeight = containerRef.current.clientHeight;
    
    // 计算气泡实际大小（像素）
    const bubbleWidth = 200 + bubbleSize * 100;
    const bubbleHeight = bubbleWidth;
    const bubbleRadius = Math.max(bubbleWidth, bubbleHeight) / 2;
    
    // 虚拟空气墙：确保气泡边缘距离容器边缘至少20px
    const wallPadding = 20;
    const safeRadius = bubbleRadius + wallPadding;
    
    // 转换为百分比
    const minXPercent = (safeRadius / containerWidth) * 100;
    const maxXPercent = 100 - (safeRadius / containerWidth) * 100;
    const minYPercent = (safeRadius / containerHeight) * 100;
    const maxYPercent = 100 - (safeRadius / containerHeight) * 100;
    
    return {
      minX: Math.max(0, minXPercent),
      maxX: Math.min(100, maxXPercent),
      minY: Math.max(0, minYPercent),
      maxY: Math.min(100, maxYPercent),
      radius: bubbleRadius
    };
  };

  const initializeBubbles = () => {
    if (quotes.length === 0) return;
    
    // 等待容器渲染完成
    setTimeout(() => {
      if (!containerRef.current) return;
      
      const random = new Random();
      const initialQuotes = [];
      const usedIndices = new Set();
      
      for (let i = 0; i < Math.min(bubbleCount, quotes.length); i++) {
        let index;
        do {
          index = random.nextInt(quotes.length);
        } while (usedIndices.has(index) && usedIndices.size < quotes.length);
        
        usedIndices.add(index);
        const quote = quotes[index];
        
        // 计算气泡大小（像素）
        const bubbleSize = random.nextFloat() * 0.5 + 0.7; // 0.7-1.2倍
        
        // 获取该气泡的安全边界（虚拟空气墙）
        const bounds = getBubbleBounds(bubbleSize);
        
        // 确保气泡中心在安全区域内
        const x = random.nextFloat() * (bounds.maxX - bounds.minX) + bounds.minX;
        const y = random.nextFloat() * (bounds.maxY - bounds.minY) + bounds.minY;
        
        initialQuotes.push({
          ...quote,
          x: x,
          y: y,
          size: bubbleSize,
          rotation: random.nextFloat() * 10 - 5, // -5到5度
          id: `bubble-${i}-${Date.now()}`,
          vx: (random.nextFloat() - 0.5) * 0.2, // 初始速度 x（减小速度）
          vy: (random.nextFloat() - 0.5) * 0.2, // 初始速度 y
          bounds: bounds // 保存边界信息
        });
      }
      
      setDisplayedQuotes(initialQuotes);
    }, 100);
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
        
        // 计算气泡大小
        const bubbleSize = random.nextFloat() * 0.5 + 0.7;
        
        // 获取该气泡的安全边界（虚拟空气墙）
        const bounds = getBubbleBounds(bubbleSize);
        
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
          vx: (random.nextFloat() - 0.5) * 0.2,
          vy: (random.nextFloat() - 0.5) * 0.2,
          bounds: bounds
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
      'rgba(59, 130, 246, 0.15)', // blue
      'rgba(168, 85, 247, 0.15)', // purple
      'rgba(236, 72, 153, 0.15)', // pink
      'rgba(99, 102, 241, 0.15)', // indigo
      'rgba(6, 182, 212, 0.15)', // cyan
      'rgba(20, 184, 166, 0.15)', // teal
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
            className="relative w-full h-[calc(100vh-200px)] min-h-[600px] bg-gradient-to-br from-blue-900/30 via-cyan-900/20 to-purple-900/30 rounded-xl overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, rgba(30, 58, 138, 0.3) 0%, rgba(14, 116, 144, 0.2) 50%, rgba(88, 28, 135, 0.3) 100%)',
              width: '100%',
              maxWidth: '100%'
            }}
          >
            <AnimatePresence mode="popLayout">
              {displayedQuotes.map((bubble, index) => {
                // 获取或计算气泡的安全边界（虚拟空气墙）
                const bounds = bubble.bounds || getBubbleBounds(bubble.size);
                
                // 确保当前位置在安全边界内（空气墙内）
                const clampedX = Math.max(bounds.minX, Math.min(bounds.maxX, bubble.x));
                const clampedY = Math.max(bounds.minY, Math.min(bounds.maxY, bubble.y));
                
                // 计算移动范围，确保不超出空气墙
                const availableRangeX = bounds.maxX - bounds.minX;
                const availableRangeY = bounds.maxY - bounds.minY;
                const moveRangeX = Math.min(2, availableRangeX * 0.15); // 最大移动2%或可用范围的15%
                const moveRangeY = Math.min(2, availableRangeY * 0.15);
                
                // 计算移动目标位置，确保在空气墙内
                const moveX = bubble.vx || (Math.random() - 0.5) * moveRangeX;
                const moveY = bubble.vy || (Math.random() - 0.5) * moveRangeY;
                
                const targetX = Math.max(
                  bounds.minX,
                  Math.min(bounds.maxX, clampedX + moveX)
                );
                const targetY = Math.max(
                  bounds.minY,
                  Math.min(bounds.maxY, clampedY + moveY)
                );
                
                const moveDuration = 18 + Math.random() * 12; // 18-30秒，更慢的移动
                const opacityDuration = 3 + Math.random() * 2; // 3-5秒
                
                return (
                  <motion.div
                    key={bubble.id}
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{
                      opacity: [0.6, 0.85, 0.6],
                      scale: bubble.size,
                      x: [`${clampedX}%`, `${targetX}%`, `${clampedX}%`],
                      y: [`${clampedY}%`, `${targetY}%`, `${clampedY}%`],
                      rotate: bubble.rotation
                    }}
                    exit={{
                      opacity: [0.85, 0.5, 0],
                      scale: [bubble.size, bubble.size * 1.4, 0],
                      rotate: bubble.rotation + (Math.random() > 0.5 ? 180 : -180),
                      x: `${clampedX + (Math.random() - 0.5) * 10}%`,
                      y: `${clampedY + (Math.random() - 0.5) * 10}%`
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
                      left: `${clampedX}%`,
                      top: `${clampedY}%`,
                      transform: 'translate(-50%, -50%)',
                      width: `${200 + bubble.size * 100}px`,
                      height: `${200 + bubble.size * 100}px`,
                      maxWidth: '350px',
                      maxHeight: '350px',
                    }}
                    onClick={() => handleBubbleClick(bubble.id)}
                    whileHover={{ scale: bubble.size * 1.05 }}
                    whileTap={{ scale: bubble.size * 0.9 }}
                  >
                {/* 肥皂泡外层光晕 */}
                <div
                  className="absolute inset-0 rounded-full"
                  style={{
                    background: `radial-gradient(circle at 30% 30%, rgba(255, 255, 255, 0.4), rgba(255, 255, 255, 0.1), transparent 70%)`,
                    filter: 'blur(2px)',
                    opacity: 0.6
                  }}
                />
                
                {/* 肥皂泡主体 */}
                <div
                  className={`absolute inset-0 rounded-full ${getBubbleColor(index)} border-2 backdrop-blur-sm flex flex-col items-center justify-center p-6`}
                  style={{
                    background: `radial-gradient(circle at 30% 30%, rgba(255, 255, 255, 0.3), ${getBubbleGradientColor(index)}, transparent)`,
                    boxShadow: `
                      inset 0 0 20px rgba(255, 255, 255, 0.2),
                      inset -20px -20px 30px rgba(0, 0, 0, 0.1),
                      0 10px 30px rgba(0, 0, 0, 0.3)
                    `,
                    fontSize: `${0.85 + bubble.size * 0.25}rem`,
                    lineHeight: '1.5',
                    wordBreak: 'break-word',
                    overflow: 'hidden'
                  }}
                >
                  <div className="font-medium text-center text-white relative z-10">
                    {bubble.quote}
                  </div>
                  {bubble.category && (
                    <div className="text-xs text-center mt-2 opacity-80 text-white relative z-10">
                      {bubble.category}
                    </div>
                  )}
                </div>
                
                {/* 肥皂泡高光 */}
                <div
                  className="absolute rounded-full"
                  style={{
                    width: '30%',
                    height: '30%',
                    top: '15%',
                    left: '20%',
                    background: 'radial-gradient(circle, rgba(255, 255, 255, 0.6), transparent)',
                    filter: 'blur(1px)',
                    pointerEvents: 'none'
                  }}
                />
              </motion.div>
                );
              })}
            </AnimatePresence>
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
