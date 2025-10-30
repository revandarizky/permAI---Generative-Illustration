import React, { useEffect } from 'react';
import { GeneratedImage } from '../types';
import { DownloadIcon, ChevronLeftIcon, ChevronRightIcon, SparkleIcon, WandIcon, TrashIcon } from './icons';

interface ImagePreviewModalProps {
  image: GeneratedImage;
  currentIndex: number;
  totalImages: number;
  onClose: () => void;
  onNext: () => void;
  onPrev: () => void;
  onDownload: (image: GeneratedImage) => void;
  onCreateVariation: (image: GeneratedImage) => void;
  onRegenerate?: () => void;
  onDelete?: () => void;
}

const ImagePreviewModal: React.FC<ImagePreviewModalProps> = ({ 
    image, 
    currentIndex,
    totalImages,
    onClose, 
    onNext,
    onPrev,
    onDownload,
    onCreateVariation,
    onRegenerate,
    onDelete
}) => {
  const handleModalContentClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') {
        onNext();
      } else if (e.key === 'ArrowLeft') {
        onPrev();
      } else if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onNext, onPrev, onClose]);


  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4 transition-opacity duration-300" 
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="image-preview-title"
    >
        {totalImages > 1 && (
            <>
                <button
                    onClick={(e) => { e.stopPropagation(); onPrev(); }}
                    disabled={currentIndex === 0}
                    className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/40 text-white p-2 rounded-full hover:bg-black/70 transition-colors disabled:opacity-20 disabled:cursor-not-allowed z-20"
                    aria-label="Previous image"
                >
                    <ChevronLeftIcon />
                </button>
                 <button
                    onClick={(e) => { e.stopPropagation(); onNext(); }}
                    disabled={currentIndex >= totalImages - 1}
                    className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/40 text-white p-2 rounded-full hover:bg-black/70 transition-colors disabled:opacity-20 disabled:cursor-not-allowed z-20"
                    aria-label="Next image"
                >
                    <ChevronRightIcon />
                </button>
            </>
        )}
      <div 
        className="bg-gray-800 rounded-lg shadow-2xl p-4 relative flex flex-col gap-4 max-w-4xl w-full"
        onClick={handleModalContentClick}
      >
        <button 
          onClick={onClose} 
          className="absolute -top-4 -right-4 bg-white text-gray-800 rounded-full w-10 h-10 flex items-center justify-center font-bold text-2xl hover:bg-gray-200 transition-colors z-30"
          aria-label="Close preview"
        >
          &times;
        </button>
        <div className="flex items-center justify-center flex-grow min-h-0">
            <img src={image.src} alt={image.alt} className="max-w-full max-h-[80vh] object-contain rounded-md" />
        </div>
        {/* Revamped Control Bar */}
        <div className="flex-shrink-0 flex items-center justify-between mt-2 gap-4">
            <p id="image-preview-title" className="text-gray-400 text-sm truncate flex-1 min-w-0" title={image.alt}>
                {image.alt}
            </p>
            <div className="flex items-center gap-2 flex-shrink-0">
                <span className="bg-gray-700 text-gray-200 text-sm font-semibold px-3 py-1 rounded-full">
                    {currentIndex + 1} / {totalImages}
                </span>
                {onRegenerate && (
                    <button
                        onClick={onRegenerate}
                        className="bg-gray-600 text-white font-bold py-2 px-4 rounded-lg flex items-center gap-2 hover:bg-gray-500 transition-colors"
                        title="Generate a new set of images with the same prompt and settings"
                    >
                        <WandIcon /> Try Again
                    </button>
                )}
                <button
                    onClick={() => onCreateVariation(image)}
                    className="bg-gray-600 text-white font-bold py-2 px-4 rounded-lg flex items-center gap-2 hover:bg-gray-500 transition-colors"
                    title="Use this image and prompt to generate new variations"
                >
                    <SparkleIcon /> Variations
                </button>
                <button 
                    onClick={() => onDownload(image)} 
                    className="bg-purple-600 text-white font-bold py-2 px-4 rounded-lg flex items-center gap-2 hover:bg-purple-700 transition-colors"
                >
                    <DownloadIcon /> Download
                </button>
                {onDelete && (
                    <button
                        onClick={onDelete}
                        className="bg-red-800/80 text-white font-bold py-2 px-4 rounded-lg flex items-center gap-2 hover:bg-red-700 transition-colors"
                        title="Delete image from gallery"
                    >
                        <TrashIcon /> Delete
                    </button>
                )}
            </div>
        </div>
      </div>
    </div>
  );
};

export default ImagePreviewModal;