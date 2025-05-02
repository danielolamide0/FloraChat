export default function HeroBanner() {
  return (
    <section className="py-8 md:py-12">
      <div className="text-center mb-8 bg-white/70 backdrop-blur-md p-4 md:p-8 rounded-xl shadow-lg border border-green-100 mx-2 md:mx-auto max-w-[95%] md:max-w-none">
        <h2 className="text-3xl md:text-5xl font-heading font-bold mb-4">
          <span className="bg-gradient-to-r from-green-600 to-emerald-500 bg-clip-text text-transparent">FloraChat</span>
        </h2>
        <p className="text-xl font-medium text-gray-600 mb-1">by Synaptide AI</p>
        <div className="h-0.5 w-32 bg-gradient-to-r from-green-300 to-green-100 mx-auto my-6"></div>
        <p className="text-base md:text-lg max-w-2xl mx-auto">
          The ultimate plant identification companion for garden enthusiasts and plant lovers. Upload an image and discover detailed information about any plant species.
        </p>
        <div className="mt-6 flex justify-center">
          <a href="#upload-section" className="bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600 text-white px-5 md:px-6 py-2.5 md:py-3 text-sm md:text-base rounded-full font-heading font-medium transition-all shadow-md hover:shadow-lg">
            Identify Your Plant
          </a>
        </div>
      </div>
    </section>
  );
}
