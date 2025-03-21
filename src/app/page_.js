// 'use client'

// import { useState, useEffect } from 'react'
// import { useRouter } from 'next/navigation';
// import { supabase } from '@/lib/supabase';

// export default function Home() {
//   const [files, setFiles] = useState([]);
//   const [loading, setLoading] = useState(false);
//   const [results, setResults] = useState([]);
//   const [user, setUser] = useState(null);
// //   const [data, setData] = useState([]);
//   const navigate = useRouter(); // Ganti router dengan navigate

//   useEffect(() => {
//     supabase.auth.getUser().then(({ data }) => {
//       if (!data?.user) navigate.push("/login");
//       else setUser(data.user);
//     });

//     // fetchLinks();
//   }, [navigate]);

//   const handleFileChange = (e) => {
//     setFiles(Array.from(e.target.files)); // Simpan file yang dipilih
//   };

//   const handleSubmit = async (e) => {
//     e.preventDefault();
//     setLoading(true);
//     setResults([]); // Reset hasil sebelum mulai

//     for (const file of files) {
//       const formData = new FormData();
//       formData.append('images', file);
//       formData.append('filenames', file.name); // Kirim filename ke backend

//       try {
//         const response = await fetch('/api/generate', {
//           method: 'POST',
//           body: formData,
//         });

//         const data = await response.json();

//         if (data.error) {
//           console.error('Error:', data.error);
//           continue;
//         }

//         setResults((prevResults) => [...prevResults, { ...data[0], filename: file.name }]); // Tambahkan hasil satu per satu

//       } catch (error) {
//         console.error('Error:', error);
//       }

//       // Tunggu 5 detik sebelum lanjut ke gambar berikutnya
//       await new Promise(resolve => setTimeout(resolve, 1000));
//     }

//     setLoading(false);
//   };

//   return (
//     <main className="min-h-screen p-8 bg-gray-100">
//       <div className="max-w-4xl mx-auto bg-white shadow-lg rounded-xl p-6">
//         <h1 className="text-3xl font-bold mb-8 text-blue-600">Meta Tag Generator</h1>

//         <form onSubmit={handleSubmit} className="space-y-6">
//           <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-black">
//             <input type="file" multiple accept="image/*" onChange={handleFileChange} className="w-full" />
//           </div>

//           <button type="submit" disabled={loading || files.length === 0} className="bg-blue-500 text-white px-4 py-2 rounded-lg disabled:opacity-50">
//             {loading ? 'Memproses...' : 'Generate Meta Tags'}
//           </button>
//         </form>

//         {results.length > 0 && (
//           <div className="mt-8">
//             <h2 className="text-2xl font-bold text-black mb-4">Hasil:</h2>
//             <table className="min-w-full bg-white border border-gray-300">
//               <thead>
//                 <tr className="bg-gray-200 text-black">
//                   <th className="border px-4 py-2 text-left">No</th>
//                   <th className="border px-4 py-2 text-left">Title</th>
//                   <th className="border px-4 py-2 text-left">Filename</th>
//                   <th className="border px-4 py-2 text-left">Description</th>
//                   <th className="border px-4 py-2 text-left">Keywords</th>
//                 </tr>
//               </thead>
//               <tbody>
//                 {results.map((result, index) => (
//                   <tr key={index} className="border text-black">
//                     <td className="border px-4 py-2">{index + 1}</td>
//                     <td className="border px-4 py-2">{result.title}</td>
//                     <td className="border px-4 py-2">{result.filename}</td>
//                     <td className="border px-4 py-2">{result.description}</td>
//                     <td className="border px-4 py-2">{result.keywords}</td>
//                   </tr>
//                 ))}
//               </tbody>
//             </table>
//           </div>
//         )}
//       </div>
//     </main>
//   );
// }
