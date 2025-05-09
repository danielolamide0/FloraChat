import { Card, CardContent } from "@/components/ui/card";

export default function About() {
  return (
    <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl md:text-4xl font-heading font-bold mb-8">
        About <span className="bg-gradient-to-r from-green-600 to-emerald-500 bg-clip-text text-transparent">FloraChat</span>
        <span className="text-xl block mt-1 font-normal text-gray-600">by Synaptide AI</span>
      </h1>
      
      <Card className="mb-8">
        <CardContent className="p-6 md:p-8">
          <h2 className="text-2xl font-heading font-semibold text-primary mb-4">Our Mission</h2>
          <p className="mb-6">
            FloraChat by Synaptide AI was developed exclusively for plant lovers and gardening enthusiasts, providing accurate plant species identification through advanced image recognition technology. 
            Our application helps anyone passionate about plants to quickly identify species and learn more about them in an engaging, conversational format.
          </p>
          
          <h2 className="text-2xl font-heading font-semibold text-primary mb-4">How It Works</h2>
          <p className="mb-6">
            FloraChat uses sophisticated AI technology that connects to the PlantNet API to identify thousands of plant species. When you upload an image, our system analyzes the visual characteristics of the plant 
            including leaf shape, flowers, stem structure, and other distinctive features to determine the species with a high degree of accuracy. Our OpenAI-powered chatbot then provides detailed, structured information about the identified plant.
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
          
          <h2 className="text-2xl font-heading font-semibold text-primary mb-4">Key Features</h2>
          <p className="mb-6">
            <ul className="space-y-2 ml-4">
              <li className="flex items-start">
                <span className="text-primary mr-2">•</span>
                <span><strong>Real Plant Identification:</strong> Leveraging PlantNet API for accurate species recognition</span>
              </li>
              <li className="flex items-start">
                <span className="text-primary mr-2">•</span>
                <span><strong>Interactive AI Chatbot:</strong> OpenAI-powered assistant with botanical expertise</span>
              </li>
              <li className="flex items-start">
                <span className="text-primary mr-2">•</span>
                <span><strong>Reference Images:</strong> Visual confirmation from Wikipedia/Wikimedia resources</span>
              </li>
              <li className="flex items-start">
                <span className="text-primary mr-2">•</span>
                <span><strong>Structured Information:</strong> Well-formatted plant details with clear organization</span>
              </li>
            </ul>
          </p>
          
          <h2 className="text-2xl font-heading font-semibold text-primary mb-4">Our Team</h2>
          <p className="mb-6">
            FloraChat was developed by Synaptide AI, a team of researchers and developers with expertise in botany, artificial intelligence, and environmental science. 
            The project originated from a passion for plants and technology, aimed at helping garden enthusiasts and plant lovers identify and learn about the diverse botanical world around them.
          </p>
          
          <h2 className="text-2xl font-heading font-semibold text-primary mb-4">Contact Us</h2>
          <p>
            Have questions or feedback about FloraChat? We'd love to hear from you! 
            Contact us at <a href="mailto:danielolamid3@gmail.com" className="text-primary hover:underline">danielolamid3@gmail.com</a>.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
