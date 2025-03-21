import { NextResponse } from 'next/server';
const {
  GoogleGenerativeAI,
  HarmCategory,
  HarmBlockThreshold,
} = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Converts buffer to base64 for Gemini
function bufferToGenerativePart(buffer, mimeType) {
  return {
    inlineData: {
      data: buffer.toString("base64"),
      mimeType
    },
  };
}

export async function POST(request) {
  try {
    const formData = await request.formData();
    const images = formData.getAll('images');
    const filenames = formData.getAll('filenames'); // Ambil filenames dari FormData

    if (!images?.length || !filenames?.length) {
      return NextResponse.json(
        { error: 'No images or filenames provided' },
        { status: 400 }
      );
    }

    const results = [];
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" }); 
    //  gemini-2.0-flash, gemini-1.5-pro

    if (!model) {
      return NextResponse.json(
        { error: 'Model not found' },
        { status: 404 }
      );
    }

    for (let i = 0; i < images.length; i++) {
      const image = images[i];
      const filename = filenames[i] || 'Unknown';

      if (!image.type.startsWith('image/')) {
        return NextResponse.json(
          { error: 'Invalid file type. Only images are allowed.' },
          { status: 400 }
        );
      }

      try {
        const bytes = await image.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // Convert image to generative part
        const imagePart = bufferToGenerativePart(buffer, image.type);

        const prompt = "Berikan judul, deskripsi dan 20 keywords dalam bahasa inggris, pisahkan keywords dengan koma. Foto ini untuk dijual di microstock.\nDan berikan output seperti ini:\n\nTitle: title value\nDescription: descriptions value\nKeywords: list of keywords value";

        // Generate meta tags
        const result = await model.generateContent([prompt, imagePart]);
        const text = result.response.text();
        console.log(result, text);
        
        // Parse response
        const titleMatch = text.match(/(?:\*\*?)?Title:(?:\*\*?)? ([\s\S]*?)(?=\n(?:\*\*?)?(?:Description|Keywords):(?:\*\*?)?|\n|$)/i);
        const descriptionMatch = text.match(/(?:\*\*?)?Description:(?:\*\*?)? ([\s\S]*?)(?=\n(?:\*\*?)?(?:Keywords):(?:\*\*?)?|\n|$)/i);
        const keywordsMatch = text.match(/(?:\*\*?)?Keywords:(?:\*\*?)? ([\s\S]*?)(?=\n|$)/i);

        results.push({
          filename,
          title: titleMatch ? titleMatch[1].trim() : '',
          description: descriptionMatch ? descriptionMatch[1].trim() : '',
          keywords: keywordsMatch ? keywordsMatch[1].trim() : '',
        });
      } catch (imageError) {
        console.error('Error processing image:', imageError);
        results.push({
          filename,
          error: `Failed to process image: ${filename}`,
          details: imageError.message,
        });
      }
    }

    return NextResponse.json(results);
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: 'Failed to process images', details: error.message },
      { status: 500 }
    );
  }
}
