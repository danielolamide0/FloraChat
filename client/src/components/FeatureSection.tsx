import { Leaf, Database, History } from "lucide-react";

export default function FeatureSection() {
  return (
    <section className="mb-12">
      <h3 className="text-2xl font-heading font-semibold text-center mb-8">Key Features</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-md p-6 text-center">
          <div className="w-16 h-16 bg-primary-light rounded-full flex items-center justify-center text-white mx-auto mb-4">
            <Leaf className="h-6 w-6" />
          </div>
          <h4 className="text-lg font-heading font-medium mb-2">Accurate Identification</h4>
          <p className="text-neutral-dark">Our advanced AI model identifies plant species with high accuracy for plant enthusiasts and gardeners.</p>
        </div>
        
        <div className="bg-white rounded-xl shadow-md p-6 text-center">
          <div className="w-16 h-16 bg-primary-light rounded-full flex items-center justify-center text-white mx-auto mb-4">
            <Database className="h-6 w-6" />
          </div>
          <h4 className="text-lg font-heading font-medium mb-2">Extensive Database</h4>
          <p className="text-neutral-dark">Access information on thousands of plant species from various ecosystems and regions.</p>
        </div>
        
        <div className="bg-white rounded-xl shadow-md p-6 text-center">
          <div className="w-16 h-16 bg-primary-light rounded-full flex items-center justify-center text-white mx-auto mb-4">
            <History className="h-6 w-6" />
          </div>
          <h4 className="text-lg font-heading font-medium mb-2">Identification History</h4>
          <p className="text-neutral-dark">Keep track of all your previous plant identifications for easy reference and reporting.</p>
        </div>
      </div>
    </section>
  );
}
