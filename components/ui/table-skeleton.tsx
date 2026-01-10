import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface SkeletonProps {
    count?: number;
}

export function TableSkeleton({ count = 5 }: SkeletonProps) {
    return (
        <div className="w-full space-y-4 animate-in fade-in duration-500">
            {Array.from({ length: count }).map((_, i) => (
                <div key={i} className="flex items-center space-x-4 p-4 bg-white/5 rounded-2xl border border-white/5">
                    <Skeleton className="h-12 w-12 rounded-xl" />
                    <div className="space-y-2 flex-1">
                        <Skeleton className="h-4 w-[250px]" />
                        <Skeleton className="h-4 w-[200px]" />
                    </div>
                    <Skeleton className="h-10 w-10 rounded-lg" />
                    <Skeleton className="h-10 w-10 rounded-lg" />
                </div>
            ))}
        </div>
    );
}

export function CardGridSkeleton({ count = 6 }: SkeletonProps) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in duration-500">
            {Array.from({ length: count }).map((_, i) => (
                <div key={i} className="glass-panel p-6 rounded-3xl border border-white/10 space-y-6">
                    <div className="flex items-start justify-between">
                        <Skeleton className="h-16 w-16 rounded-2xl" />
                        <div className="flex gap-2">
                            <Skeleton className="h-10 w-10 rounded-xl" />
                            <Skeleton className="h-10 w-10 rounded-xl" />
                        </div>
                    </div>
                    <div className="space-y-3">
                        <Skeleton className="h-6 w-3/4" />
                        <Skeleton className="h-4 w-1/2" />
                    </div>
                    <div className="pt-4 border-t border-white/5 space-y-3">
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-5/6" />
                    </div>
                </div>
            ))}
        </div>
    );
}
