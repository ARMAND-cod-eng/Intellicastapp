// Debug helper for file processing issues
export const debugFileInfo = (file: File) => {
  console.log('=== File Debug Info ===');
  console.log('Name:', file.name);
  console.log('Size:', file.size, 'bytes');
  console.log('Type:', file.type);
  console.log('Last Modified:', new Date(file.lastModified));
  
  // Check if it's actually a PDF
  if (file.name.toLowerCase().endsWith('.pdf')) {
    console.log('File appears to be PDF based on extension');
  }
  
  if (file.type === 'application/pdf') {
    console.log('File has correct PDF MIME type');
  } else {
    console.log('WARNING: File does not have PDF MIME type');
  }
  
  // Try to read first few bytes to check PDF signature
  const reader = new FileReader();
  reader.onload = () => {
    const arrayBuffer = reader.result as ArrayBuffer;
    const bytes = new Uint8Array(arrayBuffer.slice(0, 10));
    const signature = Array.from(bytes).map(b => String.fromCharCode(b)).join('');
    console.log('File signature (first 10 bytes):', signature);
    console.log('PDF signature check:', signature.startsWith('%PDF') ? 'VALID' : 'INVALID');
  };
  reader.readAsArrayBuffer(file.slice(0, 10));
  console.log('======================');
};