import fetch from 'node-fetch';

/**
 * Fetches an image for a given plant species from Wikimedia Commons
 * @param scientificName The scientific name of the plant species
 * @returns A URL to an image of the plant, or null if none found
 */
export async function fetchPlantReferenceImage(scientificName: string): Promise<string | null> {
  try {
    // Step 1: Search for Wikipedia articles matching the plant name
    const searchQuery = encodeURIComponent(scientificName);
    const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${searchQuery}&format=json&srlimit=1`;
    
    const searchResponse = await fetch(searchUrl);
    const searchData = await searchResponse.json() as any;
    
    if (!searchData.query.search.length) {
      console.log(`No Wikipedia article found for: ${scientificName}`);
      return null;
    }
    
    // Get the title of the most relevant article
    const pageTitle = searchData.query.search[0].title;
    
    // Step 2: Get images from the Wikipedia article
    const imagesUrl = `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(pageTitle)}&prop=images&format=json&imlimit=10`;
    
    const imagesResponse = await fetch(imagesUrl);
    const imagesData = await imagesResponse.json() as any;
    
    // Extract the page ID (we don't know it in advance)
    const pages = imagesData.query.pages;
    const pageId = Object.keys(pages)[0];
    
    // Check if the page has images
    if (!pages[pageId].images || pages[pageId].images.length === 0) {
      console.log(`No images found for Wikipedia article: ${pageTitle}`);
      return null;
    }
    
    // Filter out SVG and icon images, prioritize JPG/PNG images
    let imageTitle = null;
    const images = pages[pageId].images;
    
    // Find suitable image (avoid SVGs, icons, maps, etc)
    for (const image of images) {
      const title = image.title.toLowerCase();
      
      // Skip unhelpful images
      if (
        title.includes('icon') || 
        title.includes('logo') || 
        title.includes('symbol') || 
        title.includes('map') ||
        title.endsWith('.svg') ||
        title.includes('commons-logo') ||
        title.includes('edit') ||
        title.includes('question')
      ) {
        continue;
      }
      
      // Prioritize images that seem to be photos of the plant
      if (
        title.endsWith('.jpg') || 
        title.endsWith('.jpeg') || 
        title.endsWith('.png')
      ) {
        imageTitle = image.title;
        break;
      }
    }
    
    if (!imageTitle) {
      console.log(`No suitable images found for: ${pageTitle}`);
      return null;
    }
    
    // Step 3: Get the URL for the selected image
    const imageInfoUrl = `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(imageTitle)}&prop=imageinfo&iiprop=url&format=json`;
    
    const imageInfoResponse = await fetch(imageInfoUrl);
    const imageInfoData = await imageInfoResponse.json() as any;
    
    // Extract the image URL
    const imagePages = imageInfoData.query.pages;
    const imagePageId = Object.keys(imagePages)[0];
    
    if (!imagePages[imagePageId].imageinfo || imagePages[imagePageId].imageinfo.length === 0) {
      console.log(`No image info found for: ${imageTitle}`);
      return null;
    }
    
    return imagePages[imagePageId].imageinfo[0].url;
    
  } catch (error) {
    console.error('Error fetching plant reference image:', error);
    return null;
  }
}

/**
 * Alternative method using Wikimedia Commons search directly
 * @param scientificName The scientific name of the plant species
 * @returns A URL to an image of the plant, or null if none found
 */
export async function fetchPlantImageFromCommons(scientificName: string): Promise<string | null> {
  try {
    // Search directly in Wikimedia Commons
    const searchUrl = `https://commons.wikimedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(scientificName)}&srnamespace=6&format=json&srlimit=5`;
    
    const searchResponse = await fetch(searchUrl);
    const searchData = await searchResponse.json() as any;
    
    if (!searchData.query.search.length) {
      console.log(`No Wikimedia Commons images found for: ${scientificName}`);
      return null;
    }
    
    // Loop through results to find a suitable image
    for (const result of searchData.query.search) {
      const title = result.title.toLowerCase();
      
      // Skip unhelpful images
      if (
        title.includes('icon') || 
        title.includes('logo') || 
        title.includes('symbol') || 
        title.includes('map') ||
        title.includes('commons-logo') ||
        title.includes('edit') ||
        title.includes('question')
      ) {
        continue;
      }
      
      // Get image info for this result
      const imageInfoUrl = `https://commons.wikimedia.org/w/api.php?action=query&titles=${encodeURIComponent(result.title)}&prop=imageinfo&iiprop=url&format=json`;
      
      const imageInfoResponse = await fetch(imageInfoUrl);
      const imageInfoData = await imageInfoResponse.json() as any;
      
      // Extract the image URL
      const pages = imageInfoData.query.pages;
      const pageId = Object.keys(pages)[0];
      
      if (pages[pageId].imageinfo && pages[pageId].imageinfo.length > 0) {
        return pages[pageId].imageinfo[0].url;
      }
    }
    
    return null;
    
  } catch (error) {
    console.error('Error fetching plant image from Commons:', error);
    return null;
  }
}