import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle, Calendar, FileText, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';

const CompleteTaskModal = ({ isOpen, onClose, task, onSubmit }) => {
  const [formData, setFormData] = useState({
    completionNotes: '',
    completedDate: format(new Date(), 'yyyy-MM-dd'),
    completedBy: ''
  });

  React.useEffect(() => {
    if (isOpen && task) {
      setFormData({
        completionNotes: '',
        completedDate: format(new Date(), 'yyyy-MM-dd'),
        completedBy: ''
      });
    }
  }, [isOpen, task]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.completionNotes.trim()) {
      alert('请填写完成说明');
      return;
    }
    onSubmit({
      ...formData,
      status: 'completed'
    });
  };

  if (!isOpen || !task) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4"
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-gray-800 border border-gray-700 rounded-2xl w-full max-w-lg"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between p-6 border-b border-gray-700">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/20 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-400" />
              </div>
              <h2 className="text-xl font-bold text-white">完成任务</h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-gray-700 transition-colors"
            >
              <X size={20} className="text-gray-400" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div className="p-4 bg-gray-700/50 rounded-lg">
              <p className="text-sm text-gray-400 mb-1">任务名称</p>
              <p className="text-white font-medium">{task.name}</p>
            </div>

            <div className="form-group">
              <label className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-gray-400" />
                完成日期 <span className="text-red-400">*</span>
              </label>
              <input
                type="date"
                name="completedDate"
                value={formData.completedDate}
                onChange={handleChange}
                className="form-input"
                required
                max={format(new Date(), 'yyyy-MM-dd')}
              />
            </div>

            <div className="form-group">
              <label className="flex items-center gap-2">
                <User className="h-4 w-4 text-gray-400" />
                完成人
              </label>
              <input
                type="text"
                name="completedBy"
                value={formData.completedBy}
                onChange={handleChange}
                className="form-input"
                placeholder="输入完成人姓名（可选）"
              />
            </div>

            <div className="form-group">
              <label className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-gray-400" />
                完成说明 <span className="text-red-400">*</span>
              </label>
              <textarea
                name="completionNotes"
                value={formData.completionNotes}
                onChange={handleChange}
                className="form-input min-h-[120px] resize-y"
                placeholder="请详细描述任务完成情况、遇到的问题、解决方案等..."
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                请填写任务完成情况，包括完成的工作内容、遇到的问题及解决方案等必要信息
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-gray-700">
              <Button type="button" variant="ghost" onClick={onClose}>
                取消
              </Button>
              <Button type="submit" className="bg-green-600 hover:bg-green-700">
                <CheckCircle className="mr-2 h-4 w-4" /> 确认完成
              </Button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default CompleteTaskModal;
