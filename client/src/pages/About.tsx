import { Card, CardContent } from "@/components/ui/card";

export default function About() {
  return (
    <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl md:text-4xl font-heading font-bold text-primary-dark mb-8">About PlantID</h1>
      
      <Card className="mb-8">
        <CardContent className="p-6 md:p-8">
          <h2 className="text-2xl font-heading font-semibold text-primary mb-4">Our Mission</h2>
          <p className="mb-6">
            PlantID was developed to assist plant enthusiasts, gardeners, and nature lovers by providing accurate plant species identification through advanced image recognition technology. 
            Our tool helps anyone curious about plants to quickly identify species and learn more about them.
          </p>
          
          <h2 className="text-2xl font-heading font-semibold text-primary mb-4">How It Works</h2>
          <p className="mb-6">
            PlantID uses a sophisticated machine learning model trained on thousands of plant species. When you upload an image, our system analyzes the visual characteristics of the plant 
            including leaf shape, flowers, stem structure, and other distinctive features to determine the species with a high degree of accuracy.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="bg-neutral-light p-6 rounded-lg">
              <h3 className="text-xl font-heading font-medium text-primary-dark mb-3">Key Benefits</h3>
              <ul className="space-y-2">
                <li className="flex items-start">
                  <span className="text-primary mr-2">•</span>
                  <span>Rapid plant identification in the field</span>
                </li>
                <li className="flex items-start">
                  <span className="text-primary mr-2">•</span>
                  <span>Comprehensive botanical information</span>
                </li>
                <li className="flex items-start">
                  <span className="text-primary mr-2">•</span>
                  <span>Learn about native and exotic plant species</span>
                </li>
                <li className="flex items-start">
                  <span className="text-primary mr-2">•</span>
                  <span>Identification history for reporting</span>
                </li>
              </ul>
            </div>
            
            <div className="bg-neutral-light p-6 rounded-lg">
              <h3 className="text-xl font-heading font-medium text-primary-dark mb-3">Use Cases</h3>
              <ul className="space-y-2">
                <li className="flex items-start">
                  <span className="text-primary mr-2">•</span>
                  <span>Gardening and plant care</span>
                </li>
                <li className="flex items-start">
                  <span className="text-primary mr-2">•</span>
                  <span>Nature walks and hiking</span>
                </li>
                <li className="flex items-start">
                  <span className="text-primary mr-2">•</span>
                  <span>Home plant identification</span>
                </li>
                <li className="flex items-start">
                  <span className="text-primary mr-2">•</span>
                  <span>Educational and learning purposes</span>
                </li>
              </ul>
            </div>
          </div>
          
          <h2 className="text-2xl font-heading font-semibold text-primary mb-4">Our Team</h2>
          <p className="mb-6">
            PlantID was developed by a team of researchers and developers with expertise in botany, machine learning, and environmental science. 
            The project originated as a passion project aimed at helping plant enthusiasts identify and learn about the diverse plant species around them.
          </p>
          
          <h2 className="text-2xl font-heading font-semibold text-primary mb-4">Contact Us</h2>
          <p>
            Have questions or feedback about PlantID? We'd love to hear from you! 
            Contact us at <a href="mailto:info@plantid.app" className="text-primary hover:underline">info@plantid.app</a>.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
