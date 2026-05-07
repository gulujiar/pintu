/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Upload, Image as ImageIcon, X, Download, RotateCcw, Share2, GripVertical } from 'lucide-react';

interface GridCellProps {
  id: number;
  label: string;
  image: string | null;
  onImageUpload: (id: number, file: File) => void;
  onRemove: (id: number) => void;
  className?: string;
}

const GridCell = ({ id, label, image, onImageUpload, onRemove, className = "" }: GridCellProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      onImageUpload(id, file);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onImageUpload(id, file);
    }
  };

  return (
    <div
      className={`grid-cell group ${isDragging ? 'active' : ''} ${className}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => !image && fileInputRef.current?.click()}
    >
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        accept="image/*"
      />
      
      <AnimatePresence mode="wait">
        {image ? (
          <motion.div
            key="image"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="w-full h-full relative"
          >
            <img src={image} alt={label} draggable={false} />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove(id);
                }}
                className="bg-black text-white p-2 rounded-full hover:bg-zinc-800 transition-colors shadow-lg border border-white/20"
              >
                <X size={16} />
              </button>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="placeholder"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center p-4 text-center pointer-events-none"
          >
            <svg className="mb-2 opacity-20" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="3" y="3" width="18" height="18" rx="2"/>
              <circle cx="8.5" cy="8.5" r="1.5"/>
              <path d="M21 15l-5-5L5 21"/>
            </svg>
            <span className="text-xs font-bold text-[#999] uppercase tracking-widest">{label}</span>
          </motion.div>
        )}
      </AnimatePresence>
      <div className="grid-hover-overlay" />
    </div>
  );
};

export default function App() {
  const [images, setImages] = useState<(string | null)[]>(Array(6).fill(null));

  const handleImageUpload = (id: number, file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const newImages = [...images];
      newImages[id] = e.target?.result as string;
      setImages(newImages);
    };
    reader.readAsDataURL(file);
  };

  const handleRemove = (id: number) => {
    const newImages = [...images];
    newImages[id] = null;
    setImages(newImages);
  };

  const handleReset = () => {
    if (confirm('确定要清空所有已上传的图片吗？')) {
      setImages(Array(6).fill(null));
    }
  };

  const handleExport = async () => {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 6480;
      canvas.height = 3840;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Fill background white
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const unit = 240; // 6480 / 27 = 240
      
      const cells = [
        { x: 0, y: 0, w: 9, h: 16 },
        { x: 9, y: 0, w: 9, h: 16 },
        { x: 18, y: 0, w: 4.5, h: 8 },
        { x: 22.5, y: 0, w: 4.5, h: 8 },
        { x: 18, y: 8, w: 4.5, h: 8 },
        { x: 22.5, y: 8, w: 4.5, h: 8 }
      ];

      for (let i = 0; i < images.length; i++) {
        const cell = cells[i];
        const x = cell.x * unit;
        const y = cell.y * unit;
        const w = cell.w * unit;
        const h = cell.h * unit;

        const imgData = images[i];
        if (imgData) {
          const img = new Image();
          img.src = imgData;
          await new Promise((resolve, reject) => {
            img.onload = resolve;
            img.onerror = reject;
          });

          // Object-cover calculations
          const imgRatio = img.width / img.height;
          const cellRatio = w / h;
          let sx, sy, sw, sh;

          if (imgRatio > cellRatio) {
            sh = img.height;
            sw = img.height * cellRatio;
            sx = (img.width - sw) / 2;
            sy = 0;
          } else {
            sw = img.width;
            sh = img.width / cellRatio;
            sx = 0;
            sy = (img.height - sh) / 2;
          }

          ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
        } else {
          // If no image, draw white (already done by background but explicit for clarity)
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(x, y, w, h);
        }
      }

      // Download
      const link = document.createElement('a');
      link.download = `collage_${new Date().getTime()}.png`;
      link.href = canvas.toDataURL('image/png', 1.0);
      link.click();
    } catch (error) {
      console.error('Export failed:', error);
      alert('导出失败，请重试');
    }
  };

  return (
    <div className="flex flex-col h-screen w-full">
      {/* Header */}
      <header className="h-16 flex items-center justify-between px-8 bg-white border-b border-[#E5E5E5] shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
              <rect x="3" y="3" width="18" height="18" rx="2"/>
              <path d="M3 9h18M9 21V9"/>
            </svg>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={handleReset}
            className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-red-500 transition-colors flex items-center gap-2"
          >
            <RotateCcw size={14} />
            清空画布
          </button>
          <button 
            className="px-6 py-2 bg-black text-white text-sm font-semibold rounded-full hover:bg-zinc-800 transition-colors shadow-lg active:scale-95 flex items-center gap-2"
            onClick={handleExport}
          >
            <Download size={14} />
            导出图片
          </button>
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden">
        {/* Canvas Section - Fully centered now */}
        <section className="flex-1 bg-[#F2F2F2] p-8 md:p-12 flex items-center justify-center overflow-hidden">
          <div className="w-full max-w-[1000px] aspect-[27/16] bg-white shadow-2xl p-4 ring-1 ring-black/5 relative">
            <div className="collage-grid">
              {/* Box 1: 9x16 (Row 1-2, Col 1) */}
              <GridCell
                id={0}
                label="正"
                image={images[0]}
                onImageUpload={handleImageUpload}
                onRemove={handleRemove}
                className="row-span-2"
              />
              
              {/* Box 2: 9x16 (Row 1-2, Col 2) */}
              <GridCell
                id={1}
                label="反"
                image={images[1]}
                onImageUpload={handleImageUpload}
                onRemove={handleRemove}
                className="row-span-2"
              />

              {/* Box 3: 4.5x8 (Row 1, Col 3) */}
              <GridCell
                id={2}
                label="正特"
                image={images[2]}
                onImageUpload={handleImageUpload}
                onRemove={handleRemove}
              />

              {/* Box 4: 4.5x8 (Row 1, Col 4) */}
              <GridCell
                id={3}
                label="手"
                image={images[3]}
                onImageUpload={handleImageUpload}
                onRemove={handleRemove}
              />

              {/* Box 5: 4.5x8 (Row 2, Col 3) */}
              <GridCell
                id={4}
                label="脚"
                image={images[4]}
                onImageUpload={handleImageUpload}
                onRemove={handleRemove}
              />

              {/* Box 6: 4.5x8 (Row 2, Col 4) */}
              <GridCell
                id={5}
                label="腰"
                image={images[5]}
                onImageUpload={handleImageUpload}
                onRemove={handleRemove}
              />
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="h-10 bg-white border-t border-[#E5E5E5] flex items-center justify-between px-6 shrink-0">
        <div className="flex items-center gap-4 text-[10px] text-[#999] font-medium uppercase tracking-widest leading-none">
          <span>状态：准备就绪</span>
          <span className="w-1 h-1 bg-[#CCC] rounded-full"></span>
          <span>输出尺寸：6480 x 3840px</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-[10px] text-[#999] font-bold tracking-widest">GRID_STITCH_V1.0</span>
        </div>
      </footer>
    </div>
  );

}
