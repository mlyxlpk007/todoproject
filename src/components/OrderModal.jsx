import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Save, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';

const OrderModal = ({ isOpen, onClose, onSubmit, editingOrder }) => {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    orderNumber: '',
    projectName: '',
    salesName: '',
    deviceQuantity: '',
    estimatedCompletion: '',
    priority: 'medium',
    size: '',
    moduleModel: '',
    certificationRequirements: '',
    installationEnvironment: '',
    region: '',
    technicalRequirements: '',
    notes: ''
  });

  useEffect(() => {
    if (editingOrder) {
      setFormData({
        orderNumber: editingOrder.orderNumber || '',
        projectName: editingOrder.projectName || '',
        salesName: editingOrder.salesName || '',
        deviceQuantity: editingOrder.deviceQuantity || '',
        estimatedCompletion: editingOrder.estimatedCompletion || '',
        priority: editingOrder.priority || 'medium',
        size: editingOrder.size || '',
        moduleModel: editingOrder.moduleModel || '',
        certificationRequirements: editingOrder.certificationRequirements || '',
        installationEnvironment: editingOrder.installationEnvironment || '',
        region: editingOrder.region || '',
        technicalRequirements: editingOrder.technicalRequirements || '',
        notes: editingOrder.notes || ''
      });
    } else {
      setFormData({
        orderNumber: '',
        projectName: '',
        salesName: '',
        deviceQuantity: '',
        estimatedCompletion: '',
        priority: 'medium',
        size: '',
        moduleModel: '',
        certificationRequirements: '',
        installationEnvironment: '',
        region: '',
        technicalRequirements: '',
        notes: ''
      });
    }
  }, [editingOrder, isOpen]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.orderNumber || !formData.projectName || !formData.salesName || !formData.deviceQuantity) {
      toast({
        title: "请填写必填字段",
        description: "订单编号, 项目名称, 销售名称, 和设备数量是必须的。",
        variant: "destructive"
      });
      return;
    }
    onSubmit(formData);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className="bg-gray-800 border border-gray-700 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between p-6 border-b border-gray-700">
            <h2 className="text-2xl font-bold text-white flex items-center">
              <Package className="mr-3 text-indigo-400" />
              {editingOrder ? '编辑项目' : '新建项目'}
            </h2>
            <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-700 transition-colors">
              <X size={20} className="text-gray-400" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="form-group">
                <label>订单编号 *</label>
                <input type="text" name="orderNumber" value={formData.orderNumber} onChange={handleChange} placeholder="例如: RD-2024-001" required />
              </div>
              <div className="form-group">
                <label>项目名称 *</label>
                <input type="text" name="projectName" value={formData.projectName} onChange={handleChange} placeholder="例如: 高精度传感器模组" required />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="form-group">
                <label>销售名称 *</label>
                <input type="text" name="salesName" value={formData.salesName} onChange={handleChange} placeholder="负责销售" required />
              </div>
              <div className="form-group">
                <label>设备数量 *</label>
                <input type="number" name="deviceQuantity" value={formData.deviceQuantity} onChange={handleChange} placeholder="例如: 500" min="1" required />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="form-group">
                <label>预计完成日期</label>
                <input type="date" name="estimatedCompletion" value={formData.estimatedCompletion} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label>优先级别</label>
                <select name="priority" value={formData.priority} onChange={handleChange}>
                  <option value="low">低</option>
                  <option value="medium">中</option>
                  <option value="high">高</option>
                </select>
              </div>
            </div>

            <div className="form-group">
                <label>技术要求</label>
                <textarea name="technicalRequirements" value={formData.technicalRequirements} onChange={handleChange} rows="3" placeholder="详细的技术规格和要求"></textarea>
            </div>

             <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="form-group">
                <label>尺寸</label>
                <input type="text" name="size" value={formData.size} onChange={handleChange} placeholder="例如: 120x80mm" />
              </div>
              <div className="form-group">
                <label>模组型号</label>
                <input type="text" name="moduleModel" value={formData.moduleModel} onChange={handleChange} placeholder="例如: SM-2024-A" />
              </div>
               <div className="form-group">
                <label>安装地区</label>
                <input type="text" name="region" value={formData.region} onChange={handleChange} placeholder="例如: 欧洲" />
              </div>
            </div>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="form-group">
                <label>认证要求</label>
                <input type="text" name="certificationRequirements" value={formData.certificationRequirements} onChange={handleChange} placeholder="例如: CE, FCC" />
              </div>
              <div className="form-group">
                <label>安装环境</label>
                <input type="text" name="installationEnvironment" value={formData.installationEnvironment} onChange={handleChange} placeholder="例如: 工业环境" />
              </div>
            </div>

            <div className="form-group">
              <label>备注</label>
              <textarea name="notes" value={formData.notes} onChange={handleChange} rows="2" placeholder="其他备注信息"></textarea>
            </div>

          </form>
          <div className="flex justify-end space-x-4 p-6 border-t border-gray-700">
            <Button type="button" variant="outline" onClick={onClose} className="border-gray-600 text-gray-300 hover:bg-gray-700 hover:text-white">取消</Button>
            <Button type="submit" onClick={handleSubmit} className="bg-indigo-600 hover:bg-indigo-700 text-white">
              <Save className="mr-2" size={16} />
              {editingOrder ? '更新项目' : '创建项目'}
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default OrderModal;