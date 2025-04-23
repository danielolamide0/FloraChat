import { Link, useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Eye, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { PlantIdentification } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function HistorySection() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  
  const {
    data: identifications,
    isLoading,
    isError
  } = useQuery<PlantIdentification[]>({
    queryKey: ['/api/identifications'],
    staleTime: 30000, // 30 seconds
  });

  const handleDelete = async (id: number) => {
    try {
      await apiRequest('DELETE', `/api/identifications/${id}`);
      toast({
        title: "Identification deleted",
        description: "The identification has been removed from your history.",
      });
      
      // Invalidate the identifications query to refresh the data
      queryClient.invalidateQueries({ queryKey: ['/api/identifications'] });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete identification.",
        variant: "destructive",
      });
    }
  };

  return (
    <section className="mb-12">
      <Card>
        <CardContent className="p-6 md:p-8">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-heading font-semibold">Recent Identifications</h3>
            <Link href="/history" className="text-primary hover:text-primary-dark font-medium transition-colors">
              View All History
            </Link>
          </div>

          {isLoading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex items-center gap-4 pb-4 border-b">
                  <Skeleton className="h-16 w-16 rounded" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                  <Skeleton className="h-8 w-16" />
                </div>
              ))}
            </div>
          ) : isError ? (
            <div className="text-center py-6">
              <p className="text-red-500">Failed to load recent identifications.</p>
            </div>
          ) : identifications && identifications.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-neutral-light border-b">
                  <tr>
                    <th className="text-left py-3 px-4 font-heading font-medium text-sm text-neutral-dark">Image</th>
                    <th className="text-left py-3 px-4 font-heading font-medium text-sm text-neutral-dark">Species</th>
                    <th className="text-left py-3 px-4 font-heading font-medium text-sm text-neutral-dark">Date</th>
                    <th className="text-left py-3 px-4 font-heading font-medium text-sm text-neutral-dark">Confidence</th>
                    <th className="text-left py-3 px-4 font-heading font-medium text-sm text-neutral-dark">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {identifications.slice(0, 3).map((item) => (
                    <tr key={item.id} className="border-b hover:bg-neutral-light">
                      <td className="py-2 px-4">
                        <div className="w-16 h-16 rounded overflow-hidden">
                          <img src={item.imageUrl} alt={item.scientificName} className="w-full h-full object-cover" />
                        </div>
                      </td>
                      <td className="py-2 px-4">
                        <p className="font-medium">{item.scientificName}</p>
                        <p className="text-sm text-neutral-dark">{item.commonName}</p>
                      </td>
                      <td className="py-2 px-4 text-sm">
                        {new Date(item.identifiedAt).toLocaleDateString()}
                      </td>
                      <td className="py-2 px-4">
                        <div className="bg-primary-light text-white text-xs px-3 py-1 rounded-full inline-block">
                          {item.confidence}%
                        </div>
                      </td>
                      <td className="py-2 px-4">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => window.location.href = `/identification/${item.id}`}
                          className="text-primary hover:text-primary-dark mr-2"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(item.id)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-6">
              <p>No identifications found. Upload a plant image to get started.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
