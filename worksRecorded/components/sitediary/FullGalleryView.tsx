"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
// IMPORTANT: This import needs to point to your actual backend action file.
import { getAllPhotos } from '@/server/actions/site-diary-actions'; 

// --- shadcn/ui Components ---
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from "@/components/ui/pagination";
// ----------------------------

// --- TYPES and CONSTANTS ---

interface Photo {
  id: string;
  fileUrl: string;
  Date: Date | null;
  Comment: string | null;
  Location: string | null;
}

const PHOTOS_PER_PAGE = 30;
const INITIAL_ZOOM = 1;
const MAX_ZOOM = 4;
const ZOOM_STEP = 0.2;

// Helper style function for modal navigation buttons (anchored to the full backdrop)
const navButtonStyle = (side: 'left' | 'right'): React.CSSProperties => ({
  position: 'absolute', 
  [side === 'left' ? 'left' : 'right']: '10px', 
  top: '50%',
  transform: 'translateY(-50%)',
  backgroundColor: 'rgba(0, 0, 0, 0.5)',
  color: 'white',
  border: 'none',
  padding: '10px',
  cursor: 'pointer',
  fontSize: '2rem',
  height: 'auto', 
  minWidth: '50px',
  zIndex: 1010,
  borderRadius: '4px',
});

// --- Main Component: Exported Default Function ---
export default function FullPhotoGallery({ siteId }: { siteId: string }) {
  // --- State ---
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPhotos, setTotalPhotos] = useState(0);

  // Modal
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(null);

  // Zoom and Pan
  const [zoomLevel, setZoomLevel] = useState(INITIAL_ZOOM);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const [isPanning, setIsPanning] = useState(false);
  const [startPan, setStartPan] = useState({ x: 0, y: 0 });
  
  const imageRef = useRef<HTMLImageElement>(null); 
  const totalPages = Math.ceil(totalPhotos / PHOTOS_PER_PAGE);

  // --- Effects ---

  // 1. Lock Body Scroll / Reset Zoom on Modal Change
  useEffect(() => {
    if (selectedPhotoIndex !== null) {
      document.body.style.overflow = 'hidden';
      // Reset zoom/pan when modal opens
      setZoomLevel(INITIAL_ZOOM);
      setPanX(0);
      setPanY(0);
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [selectedPhotoIndex]);


  // 2. Data Fetching Logic (Triggers on siteId OR currentPage change)
  useEffect(() => {
    async function fetchPhotos() {
      if (!siteId) return;

      try {
        setLoading(true);
        setError(null);
        setSelectedPhotoIndex(null); 

        // NOTE: This call expects your updated backend action (getAllPhotos(siteId, currentPage))
        const result = await getAllPhotos(siteId, currentPage);

        setPhotos(result.photos as Photo[]);
        setTotalPhotos(result.totalCount);

      } catch (err) {
        setError('Error loading photos. Please try again.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchPhotos();
  }, [siteId, currentPage]);

  // 3. Navigation Handlers for Expanded View
  const navigate = useCallback((direction: 'prev' | 'next') => {
    if (selectedPhotoIndex === null) return;
    
    // Reset zoom/pan before changing photo
    setZoomLevel(INITIAL_ZOOM);
    setPanX(0);
    setPanY(0);

    if (direction === 'next') {
      const nextIndex = selectedPhotoIndex + 1;
      setSelectedPhotoIndex(nextIndex < photos.length ? nextIndex : 0);
    } else { 
      const prevIndex = selectedPhotoIndex - 1;
      setSelectedPhotoIndex(prevIndex >= 0 ? prevIndex : photos.length - 1);
    }
  }, [selectedPhotoIndex, photos.length]);

  // 4. Keyboard Navigation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
        if (selectedPhotoIndex !== null) {
            if (event.key === 'ArrowRight') {
                navigate('next');
            } else if (event.key === 'ArrowLeft') {
                navigate('prev');
            } else if (event.key === 'Escape') {
                setSelectedPhotoIndex(null);
            }
        }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedPhotoIndex, navigate]);

  // 5. Zoom and Pan Handlers
  
  const handleZoom = useCallback((event: React.WheelEvent<HTMLDivElement>) => {
    event.preventDefault(); 
    let newZoomLevel;
    if (event.deltaY < 0) {
      newZoomLevel = Math.min(MAX_ZOOM, zoomLevel + ZOOM_STEP);
    } else {
      newZoomLevel = Math.max(INITIAL_ZOOM, zoomLevel - ZOOM_STEP);
    }

    setZoomLevel(newZoomLevel);
    
    if (newZoomLevel === INITIAL_ZOOM) {
        setPanX(0);
        setPanY(0);
    }
  }, [zoomLevel]);
  
  const startPanHandler = useCallback((event: React.MouseEvent) => {
    if (zoomLevel > INITIAL_ZOOM) {
      setIsPanning(true);
      setStartPan({ 
          x: event.clientX - panX, 
          y: event.clientY - panY 
      });
      event.preventDefault(); 
    }
  }, [zoomLevel, panX, panY]);

  const stopPanHandler = useCallback(() => {
    setIsPanning(false);
  }, []);

  const movePanHandler = useCallback((event: React.MouseEvent) => {
    if (!isPanning || zoomLevel === INITIAL_ZOOM) return;
    
    let newPanX = event.clientX - startPan.x;
    let newPanY = event.clientY - startPan.y;
    
    if (imageRef.current) {
        const image = imageRef.current;
        const width = image.offsetWidth;
        const height = image.offsetHeight; 
        
        const boundaryX = (width * zoomLevel - width) / 2;
        const boundaryY = (height * zoomLevel - height) / 2;

        newPanX = Math.max(-boundaryX, Math.min(boundaryX, newPanX));
        newPanY = Math.max(-boundaryY, Math.min(boundaryY, newPanY));
    }

    setPanX(newPanX);
    setPanY(newPanY);
  }, [isPanning, startPan, zoomLevel]);

  // 6. Local Pagination Component
  const GalleryPagination = () => {
    if (totalPages <= 1) return null;

    const pageNumbers = [];
    const maxPagesToShow = 5; 
    let startPage = Math.max(1, currentPage - Math.floor(maxPagesToShow / 2));
    let endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);
    
    if (endPage - startPage + 1 < maxPagesToShow) {
        startPage = Math.max(1, endPage - maxPagesToShow + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
        pageNumbers.push(i);
    }
    
    return (
        <Pagination>
            <PaginationContent>
                <PaginationItem>
                    <PaginationPrevious 
                        onClick={() => setCurrentPage(currentPage - 1)}
                        aria-disabled={currentPage === 1}
                        className={currentPage === 1 ? "pointer-events-none opacity-50" : undefined}
                    />
                </PaginationItem>
                
                {startPage > 1 && (<PaginationItem><PaginationLink onClick={() => setCurrentPage(1)}>1</PaginationLink></PaginationItem>)}
                {startPage > 2 && (<PaginationItem><PaginationEllipsis /></PaginationItem>)}
                {pageNumbers.map(page => (
                    <PaginationItem key={page}>
                        <PaginationLink 
                            onClick={() => setCurrentPage(page)}
                            isActive={page === currentPage}
                        >
                            {page}
                        </PaginationLink>
                    </PaginationItem>
                ))}
                {endPage < totalPages - 1 && (<PaginationItem><PaginationEllipsis /></PaginationItem>)}
                {endPage < totalPages && (
                     <PaginationItem>
                        <PaginationLink onClick={() => setCurrentPage(totalPages)}>{totalPages}</PaginationLink>
                    </PaginationItem>
                )}

                <PaginationItem>
                    <PaginationNext 
                        onClick={() => setCurrentPage(currentPage + 1)}
                        aria-disabled={currentPage === totalPages}
                        className={currentPage === totalPages ? "pointer-events-none opacity-50" : undefined}
                    />
                </PaginationItem>
            </PaginationContent>
        </Pagination>
    );
  }

  // --- Render Status ---
  if (error) return <p className="text-red-500 p-4">{error}</p>;

  const currentPhoto = selectedPhotoIndex !== null ? photos[selectedPhotoIndex] : null;

  // --- Main Render ---
  return (
    <>
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Project Photo Gallery ({totalPhotos} Total Photos)</CardTitle>
        </CardHeader>
        <CardContent>
          
          {loading ? (
            <div className="flex justify-center items-center h-40">
              <p>Loading photos...</p>
            </div>
          ) : photos.length === 0 ? (
            <div className="flex justify-center items-center h-40">
              <p>No photos found for this site.</p>
            </div>
          ) : (
            <>
              {/* Pagination Controls (Above Grid) */}
              <div className="mb-4 flex justify-center">
                <GalleryPagination />
              </div>

              {/* Gallery Grid */}
              <div 
                className="grid" 
                style={{
                  gridTemplateColumns: 'repeat(6, 1fr)',
                  gap: '10px',
                }}
              >
                {photos.map((photo, index) => (
                  <div
                    key={photo.id}
                    onClick={() => setSelectedPhotoIndex(index)}
                    className="cursor-pointer overflow-hidden rounded-md aspect-[4/3] transition-all hover:opacity-75"
                  >
                    <img
                      src={photo.fileUrl}
                      alt={photo.Comment || `Site Photo ${index + 1}`}
                      className="w-full h-full object-cover"
                      title={photo.Comment || `Click to expand`}
                    />
                  </div>
                ))}
              </div>
              
              {/* Pagination Controls (Below Grid) */}
              <div className="mt-4 flex justify-center">
                <GalleryPagination />
              </div>
            </>
          )}

        </CardContent>
      </Card>

      {/* Expanded View Modal with Zoom/Pan */}
      {currentPhoto && (
        <div 
          className="photo-modal-backdrop"
          onWheel={handleZoom} 
          onMouseDown={startPanHandler}
          onMouseMove={movePanHandler}
          onMouseUp={stopPanHandler}
          onMouseLeave={stopPanHandler} 
          style={{ 
            position: 'fixed', 
            top: 0, 
            left: 0, 
            width: '100vw', 
            height: '100vh', 
            backgroundColor: 'rgba(0, 0, 0, 0.9)', 
            zIndex: 1000, 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center', 
            flexDirection: 'column' 
          }}
        >
          <div 
            className="photo-modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{ 
              maxWidth: '90%', 
              maxHeight: '90%', 
              position: 'relative', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              cursor: zoomLevel > INITIAL_ZOOM ? (isPanning ? 'grabbing' : 'grab') : 'default',
              overflow: 'hidden' 
            }}
          >
            <img 
              ref={imageRef} 
              src={currentPhoto.fileUrl} 
              alt={currentPhoto.Comment || "Expanded Site Photo"} 
              style={{ 
                maxWidth: '100%', 
                maxHeight: '80vh', 
                objectFit: 'contain',
                transform: `scale(${zoomLevel}) translate(${panX / zoomLevel}px, ${panY / zoomLevel}px)`,
                transition: isPanning ? 'none' : 'transform 0.1s ease', 
                userSelect: 'none', 
                transformOrigin: 'center center' 
              }}
            />
            
            {/* Modal Close Button */}
            <Button 
              onClick={() => setSelectedPhotoIndex(null)} 
              variant="secondary"
              className="absolute top-4 right-4 z-20 rounded-full h-8 w-8 text-xl p-0 bg-black/50 text-white hover:bg-black/70"
            >
              &times;
            </Button>
            
            {/* Reset Zoom Button */}
            {zoomLevel > INITIAL_ZOOM && (
                <Button
                    onClick={() => { setZoomLevel(INITIAL_ZOOM); setPanX(0); setPanY(0); }}
                    variant="secondary"
                    className="absolute bottom-4 left-4 z-20 bg-black/50 text-white hover:bg-black/70"
                >
                    Zoom Out (1x)
                </Button>
            )}

          </div>
          
          {/* Navigation Buttons (Anchored to Backdrop for fixed position) */}
          {zoomLevel === INITIAL_ZOOM && (
              <>
                <button 
                    onClick={() => navigate('prev')} 
                    style={navButtonStyle('left')}
                >
                    &lt;
                </button>
                <button 
                    onClick={() => navigate('next')} 
                    style={navButtonStyle('right')}
                >
                    &gt;
                </button>
              </>
          )}
          
          {/* Photo Info Display */}
          <div className="mt-4 p-2 bg-black/50 rounded-lg" style={{ color: 'white', textAlign: 'center' }}>
            <p className="font-semibold">{currentPhoto.Comment}</p>
            <p className="text-sm">Taken: {currentPhoto.Date?.toLocaleDateString() || 'N/A'} at {currentPhoto.Location || 'N/A'}</p>
            <p className="text-xs mt-1">
                Photo **{selectedPhotoIndex! + 1}** of **{photos.length}** (Page **{currentPage}** of **{totalPages}**)
            </p>
          </div>
        </div>
      )}
    </>
  );
}