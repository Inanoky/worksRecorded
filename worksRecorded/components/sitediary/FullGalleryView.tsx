"use client";

import { ImageOff } from "lucide-react";
import Image from "next/image";
import type React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

// --- shadcn/ui Components ---
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	Pagination,
	PaginationContent,
	PaginationEllipsis,
	PaginationItem,
	PaginationLink,
	PaginationNext,
	PaginationPrevious,
} from "@/components/ui/pagination";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils/utils";
import { deletePhotoById } from "@/server/actions/site-diary-actions";

// ----------------------------

// --- TYPES and CONSTANTS ---

interface Photo {
	id: string;
	fileUrl: string;
	Date: Date | string | null;
	Comment: string | null;
	Location: string | null;
}

const PHOTOS_PER_PAGE = 30;
const INITIAL_ZOOM = 1;
const MAX_ZOOM = 4;
const ZOOM_STEP = 0.2;

function formatPhotoDate(value: Photo["Date"]) {
	if (!value) return "N/A";
	const date = value instanceof Date ? value : new Date(value);
	if (Number.isNaN(date.getTime())) return "N/A";
	return date.toLocaleDateString("lv-LV");
}

// Helper style function for modal navigation buttons (anchored to the full backdrop)
const navButtonStyle = (side: "left" | "right"): React.CSSProperties => ({
	position: "absolute",
	[side === "left" ? "left" : "right"]: "10px",
	top: "50%",
	transform: "translateY(-50%)",
	backgroundColor: "rgba(0, 0, 0, 0.5)",
	color: "white",
	border: "none",
	padding: "10px",
	cursor: "pointer",
	fontSize: "2rem",
	height: "auto",
	minWidth: "50px",
	zIndex: 1010,
	borderRadius: "4px",
});

const FULL_GALLERY_SKELETON_KEYS = Array.from(
	{ length: 12 },
	(_, index) => `full-gallery-skeleton-${index + 1}`,
);

function GalleryPagination({
	currentPage,
	goToPage,
	totalPages,
}: {
	currentPage: number;
	goToPage: (page: number) => void;
	totalPages: number;
}) {
	if (totalPages <= 1) return null;

	const pageNumbers = [];
	const maxPagesToShow = 5;
	let startPage = Math.max(1, currentPage - Math.floor(maxPagesToShow / 2));
	const endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);

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
						onClick={() => goToPage(currentPage - 1)}
						aria-disabled={currentPage === 1}
						className={
							currentPage === 1 ? "pointer-events-none opacity-50" : undefined
						}
					/>
				</PaginationItem>

				{startPage > 1 && (
					<PaginationItem>
						<PaginationLink onClick={() => goToPage(1)}>1</PaginationLink>
					</PaginationItem>
				)}
				{startPage > 2 && (
					<PaginationItem>
						<PaginationEllipsis />
					</PaginationItem>
				)}
				{pageNumbers.map((page) => (
					<PaginationItem key={page}>
						<PaginationLink
							onClick={() => goToPage(page)}
							isActive={page === currentPage}
						>
							{page}
						</PaginationLink>
					</PaginationItem>
				))}
				{endPage < totalPages - 1 && (
					<PaginationItem>
						<PaginationEllipsis />
					</PaginationItem>
				)}
				{endPage < totalPages && (
					<PaginationItem>
						<PaginationLink onClick={() => goToPage(totalPages)}>
							{totalPages}
						</PaginationLink>
					</PaginationItem>
				)}

				<PaginationItem>
					<PaginationNext
						onClick={() => goToPage(currentPage + 1)}
						aria-disabled={currentPage === totalPages}
						className={
							currentPage === totalPages
								? "pointer-events-none opacity-50"
								: undefined
						}
					/>
				</PaginationItem>
			</PaginationContent>
		</Pagination>
	);
}

// --- Main Component: Exported Default Function ---
export default function FullPhotoGallery({ siteId }: { siteId: string }) {
	// --- State ---
	const [photos, setPhotos] = useState<Photo[]>([]);
	const [loading, setLoading] = useState(true);
	const [deleting, setDeleting] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [selectedPhotoIds, setSelectedPhotoIds] = useState<Set<string>>(
		new Set(),
	);

	// Pagination
	const [currentPage, setCurrentPage] = useState(1);
	const [totalPhotos, setTotalPhotos] = useState(0);

	// Modal
	const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(
		null,
	);
	const [viewerLoadingUrl, setViewerLoadingUrl] = useState<string | null>(null);
	const [loadedThumbnailIds, setLoadedThumbnailIds] = useState<Set<string>>(
		new Set(),
	);
	const [failedThumbnailIds, setFailedThumbnailIds] = useState<Set<string>>(
		new Set(),
	);

	// Zoom and Pan
	const [zoomLevel, setZoomLevel] = useState(INITIAL_ZOOM);
	const [panX, setPanX] = useState(0);
	const [panY, setPanY] = useState(0);
	const [isPanning, setIsPanning] = useState(false);
	const [startPan, setStartPan] = useState({ x: 0, y: 0 });

	const imageRef = useRef<HTMLImageElement>(null);
	const loadedFullSizeUrlsRef = useRef<Set<string>>(new Set());
	const preloadRequestsRef = useRef<Map<string, Promise<boolean>>>(new Map());
	const totalPages = Math.ceil(totalPhotos / PHOTOS_PER_PAGE);

	const preloadFullSizePhoto = useCallback((url: string) => {
		if (!url) return Promise.resolve(false);
		if (loadedFullSizeUrlsRef.current.has(url)) return Promise.resolve(true);

		const existingRequest = preloadRequestsRef.current.get(url);
		if (existingRequest) return existingRequest;

		const request = new Promise<boolean>((resolve) => {
			const image = new window.Image();
			const finish = (loaded: boolean) => {
				if (loaded) loadedFullSizeUrlsRef.current.add(url);
				preloadRequestsRef.current.delete(url);
				resolve(loaded);
			};

			image.onload = () => {
				if (typeof image.decode !== "function") {
					finish(true);
					return;
				}

				void image
					.decode()
					.catch(() => undefined)
					.then(() => finish(true));
			};
			image.onerror = () => finish(false);
			image.src = url;
		});

		preloadRequestsRef.current.set(url, request);
		return request;
	}, []);

	const showPhotoAt = useCallback(
		(index: number) => {
			const photo = photos[index];
			if (!photo) return;
			const alreadyLoaded = loadedFullSizeUrlsRef.current.has(photo.fileUrl);

			setViewerLoadingUrl(alreadyLoaded ? null : photo.fileUrl);
			setSelectedPhotoIndex(index);
		},
		[photos],
	);

	const closeViewer = useCallback(() => {
		setViewerLoadingUrl(null);
		setSelectedPhotoIndex(null);
	}, []);

	const fetchPhotos = useCallback(async () => {
		if (!siteId) return;

		try {
			setLoading(true);
			setError(null);
			setSelectedPhotoIndex(null);
			setViewerLoadingUrl(null);
			setSelectedPhotoIds(new Set());
			setLoadedThumbnailIds(new Set());
			setFailedThumbnailIds(new Set());

			const response = await fetch(
				`/api/sites/${encodeURIComponent(siteId)}/photos?page=${currentPage}`,
			);
			const result = await response.json();
			if (!response.ok) {
				throw new Error(result?.error || "Failed to load photos");
			}

			setPhotos(result.photos as Photo[]);
			setTotalPhotos(result.totalCount);
		} catch (err) {
			setError("Error loading photos. Please try again.");
			console.error(err);
		} finally {
			setLoading(false);
		}
	}, [currentPage, siteId]);

	// --- Effects ---

	// 1. Lock Body Scroll / Reset Zoom on Modal Change
	useEffect(() => {
		if (selectedPhotoIndex !== null) {
			document.body.style.overflow = "hidden";
			// Reset zoom/pan when modal opens
			setZoomLevel(INITIAL_ZOOM);
			setPanX(0);
			setPanY(0);
		} else {
			document.body.style.overflow = "unset";
		}
		return () => {
			document.body.style.overflow = "unset";
		};
	}, [selectedPhotoIndex]);

	// 2. Data Fetching Logic (Triggers on siteId OR currentPage change)
	useEffect(() => {
		fetchPhotos();
	}, [fetchPhotos]);

	useEffect(() => {
		if (selectedPhotoIndex === null || photos.length < 2) return;

		const neighborIndexes = new Set([
			(selectedPhotoIndex - 1 + photos.length) % photos.length,
			(selectedPhotoIndex + 1) % photos.length,
		]);
		neighborIndexes.forEach((index) => {
			void preloadFullSizePhoto(photos[index]?.fileUrl ?? "");
		});
	}, [photos, preloadFullSizePhoto, selectedPhotoIndex]);

	useEffect(() => {
		return () => {
			preloadRequestsRef.current.clear();
		};
	}, []);

	// 3. Navigation Handlers for Expanded View
	const navigate = useCallback(
		(direction: "prev" | "next") => {
			if (selectedPhotoIndex === null) return;

			// Reset zoom/pan before changing photo
			setZoomLevel(INITIAL_ZOOM);
			setPanX(0);
			setPanY(0);

			setSelectedPhotoIndex((currentIndex) => {
				if (currentIndex === null || photos.length === 0) return currentIndex;
				const nextIndex =
					direction === "next"
						? (currentIndex + 1) % photos.length
						: (currentIndex - 1 + photos.length) % photos.length;
				const nextPhoto = photos[nextIndex];
				setViewerLoadingUrl(
					nextPhoto && !loadedFullSizeUrlsRef.current.has(nextPhoto.fileUrl)
						? nextPhoto.fileUrl
						: null,
				);
				return nextIndex;
			});
		},
		[photos, selectedPhotoIndex],
	);

	const goToPage = useCallback(
		(page: number) => {
			const safeTotalPages = Math.max(1, totalPages);
			setCurrentPage(Math.max(1, Math.min(safeTotalPages, page)));
		},
		[totalPages],
	);

	// 4. Keyboard Navigation
	useEffect(() => {
		const handleKeyDown = (event: KeyboardEvent) => {
			if (selectedPhotoIndex !== null) {
				if (event.key === "ArrowRight") {
					navigate("next");
				} else if (event.key === "ArrowLeft") {
					navigate("prev");
				} else if (event.key === "Escape") {
					closeViewer();
				}
			}
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [closeViewer, selectedPhotoIndex, navigate]);

	// 5. Zoom and Pan Handlers

	const handleZoom = useCallback(
		(event: React.WheelEvent<HTMLDivElement>) => {
			event.preventDefault();
			let newZoomLevel = zoomLevel;
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
		},
		[zoomLevel],
	);

	const startPanHandler = useCallback(
		(event: React.MouseEvent) => {
			if (zoomLevel > INITIAL_ZOOM) {
				setIsPanning(true);
				setStartPan({
					x: event.clientX - panX,
					y: event.clientY - panY,
				});
				event.preventDefault();
			}
		},
		[zoomLevel, panX, panY],
	);

	const stopPanHandler = useCallback(() => {
		setIsPanning(false);
	}, []);

	const movePanHandler = useCallback(
		(event: React.MouseEvent) => {
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
		},
		[isPanning, startPan, zoomLevel],
	);

	const togglePhotoSelection = useCallback((photoId: string) => {
		setSelectedPhotoIds((current) => {
			const next = new Set(current);
			if (next.has(photoId)) {
				next.delete(photoId);
			} else {
				next.add(photoId);
			}
			return next;
		});
	}, []);

	const deletePhotos = useCallback(
		async (photoIds: string[]) => {
			const ids = Array.from(new Set(photoIds)).filter(Boolean);
			if (!ids.length || deleting) return;

			const confirmed = window.confirm(
				ids.length > 1
					? `Delete ${ids.length} selected photos?`
					: "Delete this photo?",
			);
			if (!confirmed) return;

			try {
				setDeleting(true);
				await Promise.all(ids.map((id) => deletePhotoById(id)));

				setPhotos((current) => {
					const deleteSet = new Set(ids);
					const next = current.filter((photo) => !deleteSet.has(photo.id));
					setSelectedPhotoIndex((index) => {
						if (index == null) return null;
						if (!next.length) return null;
						return Math.min(index, next.length - 1);
					});
					return next;
				});
				setSelectedPhotoIds((current) => {
					const next = new Set(current);
					ids.forEach((id) => {
						next.delete(id);
					});
					return next;
				});
				setTotalPhotos((current) => Math.max(0, current - ids.length));

				const remainingOnPage = photos.filter(
					(photo) => !ids.includes(photo.id),
				).length;
				if (remainingOnPage === 0 && currentPage > 1) {
					setCurrentPage((page) => Math.max(1, page - 1));
				} else {
					await fetchPhotos();
				}
			} catch (err) {
				console.error("Failed to delete photos", err);
				setError("Could not delete photos. Please try again.");
			} finally {
				setDeleting(false);
			}
		},
		[currentPage, deleting, fetchPhotos, photos],
	);

	const selectAllCurrentPage = useCallback(() => {
		setSelectedPhotoIds(new Set(photos.map((photo) => photo.id)));
	}, [photos]);

	const clearSelection = useCallback(() => {
		setSelectedPhotoIds(new Set());
	}, []);

	// --- Render Status ---
	if (error) return <p className="text-red-500 p-4">{error}</p>;

	const currentPhoto =
		selectedPhotoIndex !== null ? photos[selectedPhotoIndex] : null;
	const currentPhotoIsLoading =
		currentPhoto !== null && viewerLoadingUrl === currentPhoto.fileUrl;
	const viewerIsTransitioning = currentPhotoIsLoading;
	const selectedPhotoNumber =
		selectedPhotoIndex === null ? 0 : selectedPhotoIndex + 1;

	// --- Main Render ---
	return (
		<>
			<Card className="w-full">
				<CardHeader>
					<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
						<CardTitle>
							Project Photo Gallery ({totalPhotos} Total Photos)
						</CardTitle>
						{photos.length > 0 ? (
							<div className="flex flex-wrap gap-2">
								<Button
									type="button"
									variant="outline"
									size="sm"
									disabled={deleting}
									onClick={selectAllCurrentPage}
								>
									Select page
								</Button>
								{selectedPhotoIds.size > 0 ? (
									<>
										<Button
											type="button"
											variant="outline"
											size="sm"
											disabled={deleting}
											onClick={clearSelection}
										>
											Clear
										</Button>
										<Button
											type="button"
											variant="destructive"
											size="sm"
											disabled={deleting}
											onClick={() => deletePhotos(Array.from(selectedPhotoIds))}
										>
											Delete selected ({selectedPhotoIds.size})
										</Button>
									</>
								) : null}
							</div>
						) : null}
					</div>
				</CardHeader>
				<CardContent>
					{loading ? (
						<div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
							{FULL_GALLERY_SKELETON_KEYS.map((skeletonKey) => (
								<Skeleton
									key={skeletonKey}
									className="aspect-[4/3] rounded-md"
									data-testid="full-gallery-skeleton"
								/>
							))}
						</div>
					) : photos.length === 0 ? (
						<div className="flex justify-center items-center h-40">
							<p>No photos found for this site.</p>
						</div>
					) : (
						<>
							{/* Pagination Controls (Above Grid) */}
							<div className="mb-4 flex justify-center">
								<GalleryPagination
									currentPage={currentPage}
									goToPage={goToPage}
									totalPages={totalPages}
								/>
							</div>

							{/* Gallery Grid */}
							<div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
								{photos.map((photo, index) => {
									const selected = selectedPhotoIds.has(photo.id);
									const thumbnailLoaded = loadedThumbnailIds.has(photo.id);
									const thumbnailFailed =
										failedThumbnailIds.has(photo.id) || !photo.fileUrl;
									return (
										<div
											key={photo.id}
											className={cn(
												"relative aspect-[4/3] cursor-pointer overflow-hidden rounded-md transition-all hover:opacity-75",
												selected && "ring-2 ring-green-600",
											)}
										>
											<button
												type="button"
												className="relative block h-full w-full"
												aria-label={photo.Comment || `Site Photo ${index + 1}`}
												onClick={() => showPhotoAt(index)}
												onPointerEnter={() => {
													void preloadFullSizePhoto(photo.fileUrl);
												}}
											>
												{!thumbnailLoaded && !thumbnailFailed ? (
													<Skeleton
														className="absolute inset-0 rounded-none"
														data-testid="full-gallery-thumbnail-skeleton"
													/>
												) : null}
												{thumbnailFailed ? (
													<div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-muted/40 px-2 text-center text-xs text-muted-foreground">
														<ImageOff className="h-5 w-5" aria-hidden="true" />
														<span>Photo unavailable</span>
													</div>
												) : null}
												{photo.fileUrl ? (
													<Image
														src={photo.fileUrl}
														alt={photo.Comment || `Site Photo ${index + 1}`}
														fill
														sizes="(min-width: 1024px) 16vw, (min-width: 640px) 33vw, 50vw"
														loading="lazy"
														className={cn(
															"object-cover",
															!thumbnailLoaded && "opacity-0",
														)}
														title={photo.Comment || `Click to expand`}
														onLoad={() => {
															setLoadedThumbnailIds((current) => {
																const next = new Set(current);
																next.add(photo.id);
																return next;
															});
														}}
														onError={() => {
															setFailedThumbnailIds((current) => {
																const next = new Set(current);
																next.add(photo.id);
																return next;
															});
														}}
													/>
												) : null}
											</button>
											<button
												type="button"
												onClick={(event) => {
													event.stopPropagation();
													togglePhotoSelection(photo.id);
												}}
												className="absolute left-2 top-2 z-10 rounded bg-black/65 px-2 py-1 text-xs font-medium text-white"
											>
												{selected ? "Selected" : "Select"}
											</button>
										</div>
									);
								})}
							</div>

							{/* Pagination Controls (Below Grid) */}
							<div className="mt-4 flex justify-center">
								<GalleryPagination
									currentPage={currentPage}
									goToPage={goToPage}
									totalPages={totalPages}
								/>
							</div>
						</>
					)}
				</CardContent>
			</Card>

			{/* Expanded View Modal with Zoom/Pan */}
			{currentPhoto && (
				<div
					className="photo-modal-backdrop"
					role="dialog"
					aria-modal="true"
					aria-label="Photo viewer"
					onWheel={handleZoom}
					onMouseDown={startPanHandler}
					onMouseMove={movePanHandler}
					onMouseUp={stopPanHandler}
					onMouseLeave={stopPanHandler}
					style={{
						position: "fixed",
						top: 0,
						left: 0,
						width: "100vw",
						height: "100vh",
						backgroundColor: "rgba(0, 0, 0, 0.9)",
						zIndex: 1000,
						display: "flex",
						justifyContent: "center",
						alignItems: "center",
						flexDirection: "column",
					}}
				>
					<section
						className="photo-modal-content"
						aria-label="Expanded photo"
						style={{
							maxWidth: "90%",
							maxHeight: "90%",
							width: "90vw",
							height: "80vh",
							position: "relative",
							display: "flex",
							alignItems: "center",
							justifyContent: "center",
							cursor:
								zoomLevel > INITIAL_ZOOM
									? isPanning
										? "grabbing"
										: "grab"
									: "default",
							overflow: "hidden",
						}}
					>
						{viewerIsTransitioning ? (
							<output
								className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-black/45 text-white"
								aria-live="polite"
							>
								<div className="h-10 w-10 animate-spin rounded-full border-4 border-white/30 border-t-white" />
								<span className="text-sm">Ielādē foto...</span>
							</output>
						) : null}
						<Image
							key={currentPhoto.id}
							ref={imageRef}
							src={currentPhoto.fileUrl}
							alt={currentPhoto.Comment || "Expanded Site Photo"}
							fill
							sizes="90vw"
							unoptimized
							loading="eager"
							onLoad={() => {
								loadedFullSizeUrlsRef.current.add(currentPhoto.fileUrl);
								setViewerLoadingUrl((current) =>
									current === currentPhoto.fileUrl ? null : current,
								);
							}}
							onError={() => {
								setViewerLoadingUrl((current) =>
									current === currentPhoto.fileUrl ? null : current,
								);
							}}
							style={{
								objectFit: "contain",
								opacity: currentPhotoIsLoading ? 0 : 1,
								transform: `scale(${zoomLevel}) translate(${panX / zoomLevel}px, ${panY / zoomLevel}px)`,
								transition: isPanning
									? "none"
									: "transform 0.1s ease, opacity 0.15s ease",
								userSelect: "none",
								transformOrigin: "center center",
							}}
						/>

						{/* Modal Close Button */}
						<Button
							onClick={closeViewer}
							variant="secondary"
							aria-label="Close photo viewer"
							className="absolute top-4 right-4 z-20 rounded-full h-8 w-8 text-xl p-0 bg-black/50 text-white hover:bg-black/70"
						>
							&times;
						</Button>
						<Button
							onClick={() => deletePhotos([currentPhoto.id])}
							disabled={deleting}
							variant="destructive"
							className="absolute top-4 right-16 z-20 h-8"
						>
							Delete
						</Button>

						{/* Reset Zoom Button */}
						{zoomLevel > INITIAL_ZOOM && (
							<Button
								onClick={() => {
									setZoomLevel(INITIAL_ZOOM);
									setPanX(0);
									setPanY(0);
								}}
								variant="secondary"
								className="absolute bottom-4 left-4 z-20 bg-black/50 text-white hover:bg-black/70"
							>
								Zoom Out (1x)
							</Button>
						)}
					</section>

					{/* Navigation Buttons (Anchored to Backdrop for fixed position) */}
					{zoomLevel === INITIAL_ZOOM && (
						<>
							<button
								type="button"
								onClick={() => navigate("prev")}
								aria-label="Previous photo"
								style={navButtonStyle("left")}
							>
								&lt;
							</button>
							<button
								type="button"
								onClick={() => navigate("next")}
								aria-label="Next photo"
								style={navButtonStyle("right")}
							>
								&gt;
							</button>
						</>
					)}

					{/* Photo Info Display */}
					<div
						className="mt-4 p-2 bg-black/50 rounded-lg"
						style={{ color: "white", textAlign: "center" }}
					>
						<p className="font-semibold">{currentPhoto.Comment}</p>
						<p className="text-sm">
							Taken: {formatPhotoDate(currentPhoto.Date)} at{" "}
							{currentPhoto.Location || "N/A"}
						</p>
						<p className="text-xs mt-1">
							Photo {selectedPhotoNumber} of {photos.length} (Page {currentPage}{" "}
							of {totalPages})
						</p>
					</div>
				</div>
			)}
		</>
	);
}
