"use client";
import { useRef, useCallback, ReactNode } from "react";

const SNAP_COLLAPSED = 0.15;
const SNAP_HALF = 0.5;
const SNAP_EXPANDED = 0.85;

interface BottomSheetProps {
  children: ReactNode;
  snapPoint: number;
  onSnapChange: (snap: number) => void;
}

export default function BottomSheet({ children, snapPoint, onSnapChange }: BottomSheetProps) {
  const dragStartY = useRef<number | null>(null);
  const dragStartSnap = useRef(snapPoint);

  const nearestSnap = (ratio: number) => {
    const snaps = [SNAP_COLLAPSED, SNAP_HALF, SNAP_EXPANDED];
    return snaps.reduce((prev, curr) =>
      Math.abs(curr - ratio) < Math.abs(prev - ratio) ? curr : prev
    );
  };

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    dragStartY.current = e.touches[0].clientY;
    dragStartSnap.current = snapPoint;
  }, [snapPoint]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (dragStartY.current === null) return;
    const deltaY = dragStartY.current - e.changedTouches[0].clientY;
    const deltaRatio = deltaY / window.innerHeight;
    const newSnap = nearestSnap(dragStartSnap.current + deltaRatio);
    onSnapChange(newSnap);
    dragStartY.current = null;
  }, [onSnapChange]);

  const height = `${snapPoint * 100}%`;

  return (
    <div
      className="fixed bottom-0 left-0 right-0 bg-slate-50 rounded-t-2xl shadow-[0_-4px_20px_rgba(0,0,0,0.1)] transition-[height] duration-300 ease-out z-[1000] flex flex-col md:hidden"
      style={{ height }}
    >
      <div
        className="flex justify-center py-3 cursor-grab"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div className="w-10 h-1 rounded-full bg-slate-300" />
      </div>
      <div className="flex-1 overflow-hidden">
        {children}
      </div>
    </div>
  );
}

export { SNAP_COLLAPSED, SNAP_HALF, SNAP_EXPANDED };
