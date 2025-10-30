import React, { useState, useCallback, useRef, useEffect } from 'react';
import { 
    DownloadIcon, 
    ImageIcon, 
    UploadIcon, 
    WandIcon, 
    ExclamationTriangleIcon, 
    PencilIcon, 
    ZoomInIcon,
    Ratio1x1Icon,
    Ratio3x4Icon,
    Ratio4x3Icon,
    Ratio9x16Icon,
    Ratio16x9Icon,
    LightbulbIcon,
    ChevronDownIcon,
    SparkleIcon,
    CopyIcon,
    TrashIcon
} from './components/icons';
import Spinner from './components/Spinner';
import ImagePreviewModal from './components/ImagePreviewModal';
import { STYLE_OPTIONS, ASPECT_RATIOS, GENERATION_MODELS } from './constants';
import { generateImages, editImage, generatePromptSuggestions, inferStyleFromPrompt } from './services/geminiService';
import { GeneratedImage, StyleOption, AspectRatio, GenerationModelId, Mode } from './types';


const App: React.FC = () => {
  // Common state
  const [mode, setMode] = useState<Mode>('generate');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  // Generate/Edit state
  const [prompt, setPrompt] = useState<string>('');
  const [selectedStyle, setSelectedStyle] = useState<StyleOption>(STYLE_OPTIONS[0]);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageSource, setImageSource] = useState<'paste' | 'upload' | null>(null);
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
  const [numberOfImages, setNumberOfImages] = useState<number>(4);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('1:1');
  const [generationModel, setGenerationModel] = useState<GenerationModelId>('imagen-4.0-generate-001');
  const [previewImageIndex, setPreviewImageIndex] = useState<number | null>(null);
  const [settingsVisible, setSettingsVisible] = useState<boolean>(true);
  const [isFaceless, setIsFaceless] = useState<boolean>(true);

  // Ideate state
  const [inspirationPrompt, setInspirationPrompt] = useState<string>('');
  const [inspirationImageFile, setInspirationImageFile] = useState<File | null>(null);
  const [inspirationImagePreview, setInspirationImagePreview] = useState<string | null>(null);
  const [inspirationImageSource, setInspirationImageSource] = useState<'paste' | 'upload' | null>(null);
  const [promptSuggestions, setPromptSuggestions] = useState<string[]>([]);
  const [applyingSuggestionIndex, setApplyingSuggestionIndex] = useState<number | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [autoStyleNotification, setAutoStyleNotification] = useState<string | null>(null);
  
  // Gallery state
  const [galleryImages, setGalleryImages] = useState<GeneratedImage[]>([]);
  const [previewSource, setPreviewSource] = useState<'results' | 'gallery' | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const isImagenModel = mode === 'generate' && generationModel === 'imagen-4.0-generate-001';

  const AspectRatioIcons: Record<AspectRatio, React.FC<{ className?: string }>> = {
    '1:1': Ratio1x1Icon,
    '3:4': Ratio3x4Icon,
    '4:3': Ratio4x3Icon,
    '9:16': Ratio9x16Icon,
    '16:9': Ratio16x9Icon,
  };
  
  // Load gallery from localStorage on initial render
  useEffect(() => {
    try {
      const storedImages = localStorage.getItem('permai-gallery-images');
      if (storedImages) {
        setGalleryImages(JSON.parse(storedImages));
      }
    } catch (error) {
      console.error("Failed to load images from local storage:", error);
      localStorage.removeItem('permai-gallery-images');
    }
  }, []);

  useEffect(() => {
    if (autoStyleNotification) {
        const timer = setTimeout(() => {
            setAutoStyleNotification(null);
        }, 5000); // Hide notification after 5 seconds
        return () => clearTimeout(timer);
    }
  }, [autoStyleNotification]);

  const processImageFile = useCallback((file: File | null, source: 'paste' | 'upload') => {
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        if (mode === 'ideate') {
            setInspirationImageFile(file);
            setInspirationImagePreview(result);
            setInspirationImageSource(source);
        } else {
            setImageFile(file);
            setImagePreview(result);
            setImageSource(source);
        }
      };
      reader.readAsDataURL(file);
    }
  }, [mode]);

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;
    processImageFile(file, 'upload');
  };

  const handlePaste = useCallback((event: React.ClipboardEvent<HTMLDivElement>) => {
    if (isImagenModel) return;

    const items = event.clipboardData.items;
    let file: File | null = null;

    for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith('image/')) {
            const blob = items[i].getAsFile();
            if (blob) {
                file = new File([blob], `pasted-image-${Date.now()}.${blob.type.split('/')[1]}`, { type: blob.type });
                break;
            }
        }
    }
    
    if (file) {
        processImageFile(file, 'paste');
    }
  }, [isImagenModel, processImageFile]);


  const clearImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (mode === 'ideate') {
        setInspirationImageFile(null);
        setInspirationImagePreview(null);
        setInspirationImageSource(null);
    } else {
        setImageFile(null);
        setImagePreview(null);
        setImageSource(null);
    }
    if(fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }

  const handleIdeationSubmit = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setPromptSuggestions([]);

    try {
      const suggestions = await generatePromptSuggestions(inspirationPrompt, inspirationImageFile ?? undefined);
      setPromptSuggestions(suggestions);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred.');
    } finally {
      setIsLoading(false);
    }
  }, [inspirationPrompt, inspirationImageFile]);

  const handleSubmit = useCallback(async () => {
    if (mode === 'generate') {
      if (!prompt) {
        setError('Please provide a prompt to generate images.');
        return;
      }
    } else { // edit mode
      if (!imageFile) {
        setError('Please upload an image to edit.');
        return;
      }
      if (!prompt) {
        setError('Please provide an editing instruction.');
        return;
      }
    }

    setIsLoading(true);
    setError(null);
    setGeneratedImages([]);

    try {
      if (mode === 'generate') {
        const imageUrls = await generateImages(prompt, selectedStyle, isImagenModel ? undefined : imageFile ?? undefined, numberOfImages, aspectRatio, generationModel, isFaceless);
        const newImages = imageUrls.map(url => ({ src: url, alt: prompt }));
        setGeneratedImages(newImages);
        setGalleryImages(prev => {
            const updatedGallery = [...newImages, ...prev];
            localStorage.setItem('permai-gallery-images', JSON.stringify(updatedGallery));
            return updatedGallery;
        });
      } else { // edit mode
        const imageUrl = await editImage(prompt, imageFile!, isFaceless);
        const newImage = { src: imageUrl, alt: `Edited image: ${prompt}` };
        setGeneratedImages([newImage]);
        setGalleryImages(prev => {
            const updatedGallery = [newImage, ...prev];
            localStorage.setItem('permai-gallery-images', JSON.stringify(updatedGallery));
            return updatedGallery;
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred.');
    } finally {
      setIsLoading(false);
    }
  }, [prompt, selectedStyle, imageFile, numberOfImages, aspectRatio, mode, generationModel, isImagenModel, isFaceless]);

  const triggerFileUpload = () => {
    fileInputRef.current?.click();
  };

  const handleDownload = (image: GeneratedImage) => {
    const link = document.createElement('a');
    link.href = image.src;
    link.download = `permai-illustration-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  const handleModeChange = (newMode: Mode) => {
      setMode(newMode);
      setError(null);
      if (newMode !== 'gallery') {
          setGeneratedImages([]);
      }
      setPromptSuggestions([]);
  };

  const handleCopySuggestion = (suggestion: string, index: number) => {
    navigator.clipboard.writeText(suggestion).then(() => {
        setCopiedIndex(index);
        setTimeout(() => {
            setCopiedIndex(null);
        }, 2000); // Reset after 2 seconds
    }).catch(err => {
        console.error('Failed to copy prompt: ', err);
        setError('Could not copy prompt to clipboard.');
    });
  };

  const handleUseSuggestion = async (suggestion: string, index: number) => {
    setApplyingSuggestionIndex(index);
    setError(null);

    try {
        const inferredStyleId = await inferStyleFromPrompt(suggestion);
        
        if (inferredStyleId) {
            const newStyle = STYLE_OPTIONS.find(s => s.id === inferredStyleId);
            if (newStyle) {
                setSelectedStyle(newStyle);
                setAutoStyleNotification(`Style automatically set to: ${newStyle.label}`);
            }
        } else {
            setSelectedStyle(STYLE_OPTIONS[0]);
        }

        setPrompt(suggestion);
        setMode('generate');
        setSettingsVisible(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });

    } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not apply suggestion.');
        // Fallback to basic behavior
        setPrompt(suggestion);
        setMode('generate');
    } finally {
        setApplyingSuggestionIndex(null);
    }
  }

  const handleCreateVariation = async (image: GeneratedImage) => {
    try {
      // Convert data URL to File object
      const response = await fetch(image.src);
      const blob = await response.blob();
      const file = new File([blob], `variation-source-${Date.now()}.png`, { type: blob.type });

      // Set up the UI for a new generation
      setMode('generate');
      setGenerationModel('gemini-2.5-flash-image'); // Must use a model that supports reference images
      setPrompt(image.alt);
      
      setImageFile(file);
      setImagePreview(image.src);
      setImageSource('upload'); // Treat it as an uploaded file

      setPreviewImageIndex(null); // Close the modal
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setError(err instanceof Error ? `Failed to create variation: ${err.message}` : 'An unknown error occurred while creating variation.');
    }
  };

  const handleRegenerate = useCallback(() => {
    setPreviewImageIndex(null); // Close modal
    // A small delay for a smoother UX, allowing the modal to close before loading starts
    setTimeout(() => {
        handleSubmit();
    }, 100); 
  }, [handleSubmit]);


  const handleDeleteImage = (indexToDelete: number) => {
    if (!window.confirm('Are you sure you want to permanently delete this image from your gallery?')) {
        return;
    }
    setGalleryImages(prev => {
        const updatedGallery = prev.filter((_, index) => index !== indexToDelete);
        localStorage.setItem('permai-gallery-images', JSON.stringify(updatedGallery));
        return updatedGallery;
    });
    setPreviewImageIndex(null);
    setPreviewSource(null);
  };

  const imageList = previewSource === 'gallery' ? galleryImages : generatedImages;

  const handleNextPreview = () => {
    if (previewImageIndex !== null && previewImageIndex < imageList.length - 1) {
        setPreviewImageIndex(previewImageIndex + 1);
    }
  };

  const handlePrevPreview = () => {
    if (previewImageIndex !== null && previewImageIndex > 0) {
        setPreviewImageIndex(previewImageIndex - 1);
    }
  };

  const renderImageUploader = () => {
    const currentPreview = mode === 'ideate' ? inspirationImagePreview : imagePreview;
    const currentImageSource = mode === 'ideate' ? inspirationImageSource : imageSource;
    const isDisabled = mode === 'generate' && generationModel === 'imagen-4.0-generate-001';

    return (
        <div>
            <label className="font-semibold mb-2 block">{mode === 'edit' ? 'Image to Edit' : 'Reference Image (Optional)'}</label>
             {isDisabled && <p className="text-xs text-yellow-400 mb-2">Reference images are not supported by the Imagen 4 model. Switch to Gemini Flash Image to enable.</p>}
            <div
                className={`mt-1 flex justify-center items-center w-full h-32 border-2 border-dashed rounded-lg transition-colors relative ${isDisabled ? 'border-gray-700 bg-gray-800/50 cursor-not-allowed' : 'border-gray-600 bg-gray-800'}`}
                onPaste={!isDisabled ? handlePaste : undefined}
            >
                <input id="image-upload" type="file" accept="image/*" ref={fileInputRef} onChange={handleImageUpload} className="hidden" disabled={isDisabled} />
                {currentPreview && !isDisabled ? (
                    <>
                        <img src={currentPreview} alt="Preview" className="h-full w-full object-cover rounded-lg" />
                        <button onClick={clearImage} className="absolute top-1.5 right-1.5 bg-black/60 text-white rounded-full p-0.5 leading-none text-xl w-7 h-7 flex items-center justify-center">&times;</button>
                        {currentImageSource === 'paste' && (
                            <div className="absolute bottom-1.5 left-1.5 bg-black/60 text-white text-xs font-semibold px-2 py-1 rounded">
                                Pasted
                            </div>
                        )}
                    </>
                ) : (
                    <div className={`text-center p-4 ${isDisabled ? 'text-gray-600' : 'text-gray-500'}`}>
                      <UploadIcon className="w-6 h-6 mx-auto"/> 
                      <p className="text-sm mt-1">
                        Paste an image or{' '}
                        <button
                          type="button"
                          onClick={!isDisabled ? triggerFileUpload : undefined}
                          className={`font-semibold ${isDisabled ? 'text-gray-600' : 'text-purple-400 hover:text-purple-300 focus:outline-none focus:underline'}`}
                          disabled={isDisabled}
                        >
                          upload a file
                        </button>
                      </p>
                    </div>
                )}
            </div>
        </div>
    );
  };
  
  const currentImageForPreview = previewImageIndex !== null ? imageList[previewImageIndex] : null;

  return (
    <div className="bg-gray-900 min-h-screen text-white font-sans flex flex-col items-center p-4 sm:p-8">
      <div className="w-full max-w-3xl mx-auto">
        <header className="text-center mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-purple-400">PermAI - Generative Illustration</h1>
          <p className="text-gray-400 mt-2">Create and edit stunning faceless illustrations from your ideas.</p>
        </header>

        <main className="flex flex-col gap-8">
          {/* Controls */}
          <div className="bg-gray-800 p-6 rounded-lg shadow-lg flex flex-col gap-6">
            <div className="flex bg-gray-700 rounded-lg p-1">
                <button onClick={() => handleModeChange('generate')} className={`flex-1 p-2 rounded-md text-sm font-semibold transition-colors flex items-center justify-center gap-2 ${mode === 'generate' ? 'bg-purple-600 text-white' : 'hover:bg-gray-600 text-gray-300'}`}>
                    <SparkleIcon /> Generate
                </button>
                 <button onClick={() => handleModeChange('ideate')} className={`flex-1 p-2 rounded-md text-sm font-semibold transition-colors flex items-center justify-center gap-2 ${mode === 'ideate' ? 'bg-purple-600 text-white' : 'hover:bg-gray-600 text-gray-300'}`}>
                    <LightbulbIcon /> Ideate
                </button>
                <button onClick={() => handleModeChange('edit')} className={`flex-1 p-2 rounded-md text-sm font-semibold transition-colors flex items-center justify-center gap-2 ${mode === 'edit' ? 'bg-purple-600 text-white' : 'hover:bg-gray-600 text-gray-300'}`}>
                    <PencilIcon /> Edit
                </button>
                 <button onClick={() => handleModeChange('gallery')} className={`flex-1 p-2 rounded-md text-sm font-semibold transition-colors flex items-center justify-center gap-2 ${mode === 'gallery' ? 'bg-purple-600 text-white' : 'hover:bg-gray-600 text-gray-300'}`}>
                    <ImageIcon /> Gallery ({galleryImages.length})
                </button>
            </div>
            
            {mode === 'generate' ? (
              <>
                 {autoStyleNotification && (
                    <div className="bg-green-900/50 border border-green-700 text-green-300 text-sm rounded-lg p-3 text-center transition-opacity duration-300 animate-pulse">
                        {autoStyleNotification}
                    </div>
                )}
                <div>
                    <label className="font-semibold mb-2 block">Model</label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {GENERATION_MODELS.map(model => (
                            <button 
                                key={model.label} 
                                onClick={() => setGenerationModel(model.id)} 
                                className={`p-3 text-left rounded-lg border-2 cursor-pointer transition-all h-full ${generationModel === model.id ? 'bg-purple-900/50 border-purple-500' : 'bg-gray-700 border-gray-600 hover:border-purple-500'}`}
                                aria-pressed={generationModel === model.id}
                            >
                                <p className="font-semibold text-sm">{model.label}</p>
                                <p className="text-xs text-gray-400 mt-1">{model.description}</p>
                            </button>
                        ))}
                    </div>
                </div>
                {generationModel !== 'imagen-4.0-generate-001' && renderImageUploader()}
                <div>
                  <label htmlFor="prompt-generate" className="font-semibold mb-2 block">
                    Describe Your Scene
                  </label>
                  <textarea id="prompt-generate" value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="e.g., A robot holding a red skateboard" className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none transition-all" rows={3}/>
                </div>

                <div>
                    <button onClick={() => setSettingsVisible(!settingsVisible)} className="flex items-center justify-between w-full text-left font-semibold text-gray-300 hover:text-white">
                        <span>Advanced Settings</span>
                        <ChevronDownIcon className={`w-5 h-5 transition-transform ${settingsVisible ? 'rotate-180' : ''}`} />
                    </button>
                    {settingsVisible && (
                        <div className="mt-4 pt-4 border-t border-gray-700 flex flex-col gap-4">
                            <div>
                                <label htmlFor="style-select" className="font-semibold mb-2 block">Style</label>
                                <select id="style-select" value={selectedStyle.id} onChange={(e) => { const style = STYLE_OPTIONS.find(s => s.id === e.target.value); if (style) setSelectedStyle(style); }} className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none transition-all appearance-none bg-no-repeat bg-right pr-8" style={{backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%239ca3af' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`, backgroundPosition: 'right 0.5rem center', backgroundSize: '1.5em 1.5em'}}>
                                    {STYLE_OPTIONS.map((style) => ( <option key={style.id} value={style.id}>{style.label}</option>))}
                                </select>
                            </div>
                            <div>
                                <h3 className="font-semibold mb-2 block">Aspect Ratio</h3>
                                <div className="grid grid-cols-5 gap-2">
                                    {ASPECT_RATIOS.map((ratio) => {
                                        const IconComponent = AspectRatioIcons[ratio];
                                        return (
                                            <button key={ratio} onClick={() => setAspectRatio(ratio)} className={`p-2 text-xs font-semibold rounded-lg border-2 transition-all flex flex-col items-center justify-center gap-1 h-14 ${aspectRatio === ratio ? 'bg-purple-600 border-purple-500' : 'bg-gray-700 border-gray-600 hover:border-purple-500'}`} aria-label={`Aspect ratio ${ratio}`} title={`Aspect ratio ${ratio}`}>
                                                <IconComponent className="w-5 h-5"/>
                                                <span>{ratio}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                            <div>
                                <h3 className="font-semibold mb-2 block">Number of Images</h3>
                                <div className="flex items-center gap-4">
                                    <input type="range" min="1" max="10" value={numberOfImages} onChange={(e) => setNumberOfImages(Number(e.target.value))} className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-purple-500 [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-purple-500"/>
                                    <span className="bg-gray-700 text-white text-sm font-semibold px-3 py-1 rounded-full min-w-[40px] text-center">{numberOfImages}</span>
                                </div>
                            </div>
                             <div>
                                <label className="font-semibold mb-2 flex items-center justify-between">
                                    <span>Faceless Style</span>
                                    <div className="relative inline-flex items-center cursor-pointer">
                                        <input type="checkbox" checked={isFaceless} onChange={() => setIsFaceless(!isFaceless)} className="sr-only peer" id="faceless-toggle-generate"/>
                                        <label htmlFor="faceless-toggle-generate" className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></label>
                                    </div>
                                </label>
                                <p className="text-xs text-gray-500 mt-1">Hides or abstracts facial details. Disable for portraits.</p>
                            </div>
                        </div>
                    )}
                </div>
              </>
            ) : mode === 'edit' ? (
                <>
                    {renderImageUploader()}
                     <div>
                        <label htmlFor="prompt-edit" className="font-semibold mb-2 block">
                            Describe Your Edit
                        </label>
                        <textarea id="prompt-edit" value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="e.g., Add a retro filter" className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none transition-all" rows={4}/>
                    </div>
                     <div>
                        <label className="font-semibold mb-2 flex items-center justify-between">
                            <span>Maintain Faceless Style</span>
                             <div className="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" checked={isFaceless} onChange={() => setIsFaceless(!isFaceless)} className="sr-only peer" id="faceless-toggle-edit" />
                                <label htmlFor="faceless-toggle-edit" className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></label>
                            </div>
                        </label>
                    </div>
                </>
            ) : mode === 'ideate' ? (
                <>
                    {renderImageUploader()}
                     <div>
                        <label htmlFor="prompt-ideate" className="font-semibold mb-2 block">
                            Describe Your Idea (Optional)
                        </label>
                        <textarea id="prompt-ideate" value={inspirationPrompt} onChange={(e) => setInspirationPrompt(e.target.value)} placeholder="e.g., A cat wearing a wizard hat, or leave blank for random ideas" className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none transition-all" rows={4}/>
                    </div>
                </>
            ) : null}
            
            {mode !== 'gallery' && (
              <div className="mt-auto pt-6 border-t border-gray-700">
                  <button 
                    onClick={mode === 'ideate' ? handleIdeationSubmit : handleSubmit} 
                    disabled={isLoading || (mode === 'generate' && !prompt) || (mode === 'edit' && (!prompt || !imageFile))} 
                    className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold py-3 px-4 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-lg"
                  >
                    {isLoading ? 'Working...' : (mode === 'generate' ? 'Generate' : (mode === 'edit' ? 'Apply Edit' : 'Get Prompt Ideas'))}
                  </button>
              </div>
            )}
          </div>

          {/* Output */}
          <div className="bg-gray-800 p-6 rounded-lg shadow-lg flex flex-col min-h-[400px]">
            {isLoading ? (
              <div className="flex-grow flex items-center justify-center">
                <Spinner text={mode === 'generate' ? 'Creating your masterpieces...' : (mode === 'edit' ? 'Applying your edits...' : 'Generating creative ideas...')} />
              </div>
            ) : error ? (
              <div className="flex-grow flex flex-col items-center justify-center text-center">
                <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-6 max-w-sm w-full">
                    <ExclamationTriangleIcon className="w-12 h-12 mx-auto text-red-400" />
                    <p className="font-bold mt-4 text-red-300 text-lg">Action Failed</p>
                    <p className="text-sm mt-2 text-gray-400 break-words">{error}</p>
                    <button onClick={mode === 'ideate' ? handleIdeationSubmit : handleSubmit} className="mt-6 bg-purple-600 text-white font-bold py-2 px-5 rounded-lg hover:bg-purple-700 transition-colors flex items-center justify-center gap-2 mx-auto">
                        <WandIcon className="w-5 h-5" /> Retry
                    </button>
                </div>
              </div>
            ) : generatedImages.length > 0 && (mode === 'generate' || mode === 'edit') ? (
                <div className="flex flex-col h-full">
                    <p className="text-gray-400 mb-4 text-center text-sm">
                      {mode === 'edit' ? 'Your edited image is ready.' : 'Click an image to see a larger preview.'}
                    </p>
                    <div className="flex-grow w-full grid grid-cols-2 sm:grid-cols-4 gap-4 overflow-y-auto pr-2" style={{maxHeight: 'calc(100vh - 18rem)'}}>
                        {generatedImages.map((image, index) => (
                            <div 
                                key={index} 
                                className="relative group bg-gray-900 rounded-lg flex items-center justify-center shadow-md cursor-pointer" 
                                style={mode === 'generate' ? { aspectRatio: aspectRatio.replace(':', ' / ') } : {}}
                                onClick={() => { setPreviewImageIndex(index); setPreviewSource('results'); }}
                            >
                                <img 
                                    src={image.src} 
                                    alt={image.alt} 
                                    className={`rounded ${mode === 'generate' ? "max-w-full max-h-full object-contain" : "w-full h-auto"}`} 
                                />
                                <div className="absolute inset-0 bg-black bg-opacity-60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-lg pointer-events-none">
                                    <ZoomInIcon className="w-12 h-12 text-white" />
                                </div>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation(); // Prevent modal from opening
                                        handleDownload(image);
                                    }}
                                    className="absolute top-2 right-2 bg-gray-800/70 text-white p-2 rounded-md opacity-0 group-hover:opacity-100 transition-all hover:bg-purple-600 focus:opacity-100"
                                    title="Download image"
                                    aria-label="Download image"
                                >
                                    <DownloadIcon className="w-5 h-5" />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            ) : promptSuggestions.length > 0 && mode === 'ideate' ? (
                <div className="flex flex-col h-full gap-4 overflow-y-auto">
                    <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-lg text-gray-300">Here are some creative prompts:</h3>
                        <button 
                            onClick={handleIdeationSubmit} 
                            disabled={isLoading}
                            className="bg-gray-700 hover:bg-gray-600 text-gray-300 font-semibold py-2 px-3 rounded-lg transition-colors text-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-wait"
                        >
                            <WandIcon className="w-4 h-4" />
                            Regenerate
                        </button>
                    </div>
                    {promptSuggestions.map((suggestion, index) => {
                        const isApplying = applyingSuggestionIndex === index;
                        const isCopied = copiedIndex === index;
                        return (
                            <div key={index} className="bg-gray-900/50 p-4 rounded-lg">
                                <p className="text-gray-300">{suggestion}</p>
                                <div className="flex items-center gap-2 mt-4">
                                    <button 
                                        onClick={() => handleUseSuggestion(suggestion, index)} 
                                        className={`flex-1 text-white font-semibold py-2 px-3 rounded-lg transition-colors text-sm disabled:opacity-70 disabled:cursor-wait flex items-center justify-center gap-2 ${
                                            isApplying ? 'bg-orange-600' : 'bg-purple-600 hover:bg-purple-700'
                                        }`}
                                        disabled={applyingSuggestionIndex !== null}
                                    >
                                        {isApplying ? 'Applying...' : 'Use this prompt'}
                                    </button>
                                    <button
                                        onClick={() => handleCopySuggestion(suggestion, index)}
                                        className="bg-gray-700 hover:bg-gray-600 text-gray-300 font-semibold py-2 px-3 rounded-lg transition-colors text-sm flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                                        disabled={isCopied}
                                    >
                                        <CopyIcon className="w-4 h-4" />
                                        {isCopied ? 'Copied!' : 'Copy'}
                                    </button>
                                </div>
                            </div>
                        )
                    })}
                </div>
            ) : mode === 'gallery' ? (
                <div className="flex flex-col h-full">
                    {galleryImages.length > 0 ? (
                        <>
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="font-semibold text-lg text-gray-300">Image Gallery</h3>
                                <span className="text-gray-400 text-sm">{galleryImages.length} image{galleryImages.length !== 1 ? 's' : ''}</span>
                            </div>
                            <div className="flex-grow w-full grid grid-cols-2 sm:grid-cols-4 gap-4 overflow-y-auto pr-2" style={{maxHeight: 'calc(100vh - 20rem)'}}>
                                {galleryImages.map((image, index) => (
                                    <div 
                                        key={`${image.src.slice(-20)}-${index}`} 
                                        className="relative group bg-gray-900 rounded-lg flex items-center justify-center shadow-md cursor-pointer aspect-square"
                                        onClick={() => { setPreviewImageIndex(index); setPreviewSource('gallery'); }}
                                    >
                                        <img 
                                            src={image.src} 
                                            alt={image.alt} 
                                            className="max-w-full max-h-full object-cover rounded-lg w-full h-full"
                                        />
                                        <div className="absolute inset-0 bg-black bg-opacity-60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-lg pointer-events-none">
                                            <ZoomInIcon className="w-12 h-12 text-white" />
                                        </div>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleDeleteImage(index);
                                            }}
                                            className="absolute top-2 right-2 bg-red-800/80 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-all hover:bg-red-700 focus:opacity-100 z-10"
                                            title="Delete image"
                                            aria-label="Delete image"
                                        >
                                            <TrashIcon className="w-5 h-5" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </>
                    ) : (
                        <div className="flex-grow flex items-center justify-center text-center text-gray-500">
                            <div>
                                <ImageIcon className="w-16 h-16 mx-auto" />
                                <p className="mt-4">Your saved images will appear here.</p>

                                <p className="text-sm text-gray-600">Generated and edited images are automatically saved.</p>
                            </div>
                        </div>
                    )}
                </div>
            ) : (
              <div className="flex-grow flex items-center justify-center text-center text-gray-500">
                <div>
                  {mode === 'ideate' ? (
                    <LightbulbIcon className="w-16 h-16 mx-auto" />
                  ) : (
                    <ImageIcon className="w-16 h-16 mx-auto" />
                  )}
                  <p className="mt-4">{mode === 'ideate' ? 'Prompt suggestions will appear here.' : 'Your results will appear here.'}</p>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
      {currentImageForPreview && (
        <ImagePreviewModal 
            image={currentImageForPreview} 
            currentIndex={previewImageIndex!}
            totalImages={imageList.length}
            onClose={() => { setPreviewImageIndex(null); setPreviewSource(null); }}
            onNext={handleNextPreview}
            onPrev={handlePrevPreview}
            onDownload={handleDownload} 
            onCreateVariation={handleCreateVariation}
            onRegenerate={previewSource === 'results' ? handleRegenerate : undefined}
            onDelete={previewSource === 'gallery' ? () => handleDeleteImage(previewImageIndex!) : undefined}
        />
      )}
    </div>
  );
};

export default App;