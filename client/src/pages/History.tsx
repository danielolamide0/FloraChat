import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { PlantIdentification } from "@shared/schema";
import { Eye, Trash2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

export default function History() {
  const { toast } = useToast();
  
  const {
    data: identifications,
    isLoading,
    isError,
    refetch
  } = useQuery<PlantIdentification[]>({
    queryKey: ['/api/identifications'],
  });

  const handleDelete = async (id: number) => {
    try {
      await apiRequest('DELETE', `/api/identifications/${id}`);
      toast({
        title: "Identification deleted",
        description: "The identification has been removed from your history.",
      });
      refetch();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete identification.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl md:text-4xl font-heading font-bold mb-8">
        <span className="bg-gradient-to-r from-green-600 to-emerald-500 bg-clip-text text-transparent">FloraChat</span> Identification History
      </h1>
      
      <Card className="mb-8">
        <CardContent className="p-6">
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
            <div className="text-center py-8">
              <p className="text-lg font-medium text-red-500">Failed to load identification history.</p>
              <Button onClick={() => refetch()} variant="outline" className="mt-4">
                Try Again
              </Button>
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
                  {identifications.map((item) => (
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
                        {item.identifiedAt ? new Date(item.identifiedAt).toLocaleDateString() : 'Unknown'}
                      </td>
                      <td className="py-2 px-4">
                        <div className="bg-gradient-to-r from-green-600 to-green-500 text-white text-xs px-3 py-1 rounded-full inline-block shadow-sm">
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
            <div className="text-center py-12">
              <p className="text-lg mb-2 font-medium">No identifications found</p>
              <p className="text-neutral-dark mb-6">You haven't identified any plants yet.</p>
              <Button onClick={() => window.location.href = "/"} className="bg-primary hover:bg-primary-dark text-white">
                Identify Plant
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
