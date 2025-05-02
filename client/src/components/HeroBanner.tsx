export default function HeroBanner() {
  return (
    <section className="py-8 md:py-12">
      <div className="text-center mb-8">
        <h2 className="text-3xl md:text-5xl font-heading font-bold mb-4">
          <span className="bg-gradient-to-r from-green-600 to-emerald-500 bg-clip-text text-transparent">FloraChat</span>
        </h2>
        <p className="text-xl font-medium text-gray-600 mb-1">by Synaptide AI</p>
        <p className="text-lg max-w-2xl mx-auto mt-4">
          The ultimate plant identification companion for garden enthusiasts and plant lovers. Upload an image and discover detailed information about any plant species.
        </p>
      </div>
    </section>
  );
}
