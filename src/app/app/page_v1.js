'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation';
import supabase from '@/lib/supabase';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { Button } from "@/components/ui/button"
import { Upload, X } from "lucide-react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

export default function Home() {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);
  const [user, setUser] = useState(null);
  const [userCredit, setUserCredit] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  const navigate = useRouter();

  // Pindahkan fetchUserCredit ke luar agar bisa diakses oleh fungsi lain
  const fetchUserCredit = async (email) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('credits')
        .eq('email', email)
        .single();

      if (error) throw error;
      if (data) setUserCredit(data.credits);
    } catch (error) {
      console.error('Error fetching credit:', error);
    }
  };

  // Fungsi untuk mengurangi credit
  const decreaseCredit = async (email) => {
    try {
      const { error } = await supabase.rpc('decrease_credit', {
        user_email: email
      });
      
      if (error) throw error;
      
      // Sekarang fetchUserCredit bisa diakses
      await fetchUserCredit(email);
      return true;
    } catch (error) {
      console.error('Error decreasing credit:', error);
      return false;
    }
  };

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data?.user) navigate.push("/masuk");
      else {
        setUser(data.user);
        fetchUserCredit(data.user.email);
      }
    });
  }, [navigate]);

  const handleFileChange = (e) => {
    setFiles(Array.from(e.target.files)); // Simpan file yang dipilih
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Cek credit tersedia
    if (userCredit <= 0) {
      alert('Maaf, credit Anda tidak mencukupi!');
      return;
    }

    setLoading(true);
    setResults([]);

    for (const file of files) {
      const formData = new FormData();
      formData.append('images', file);
      formData.append('filenames', file.name);

      try {
        const response = await fetch('/api/generate', {
          method: 'POST',
          body: formData,
        });

        const data = await response.json();

        // Kurangi credit hanya jika request berhasil
        if (response.status === 200 && !data.error) {
          // Kurangi credit setelah request berhasil
          const creditDecreased = await decreaseCredit(user.email);
          if (!creditDecreased) {
            console.error('Gagal mengurangi credit');
            continue;
          }
          
          setResults((prevResults) => [...prevResults, { ...data[0], filename: file.name }]);
        } else {
          console.error('Error:', data.error);
        }

      } catch (error) {
        console.error('Error:', error);
      }

      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    setLoading(false);
  };

  // Fungsi untuk export ke CSV
  const exportToCSV = () => {
    if (results.length === 0) return;

    const csvContent = [
      ['No', 'Title', 'Filename', 'Description', 'Keywords'],
      ...results.map((item, index) => [
        index + 1,
        item.title,
        item.filename,
        item.description,
        item.keywords
      ])
    ]
    .map(row => row.join(','))
    .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, 'meta_tags_result.csv');
  };

  // Fungsi untuk export ke XLSX
  const exportToXLSX = () => {
    if (results.length === 0) return;

    const ws = XLSX.utils.json_to_sheet(
      results.map((item, index) => ({
        'No': index + 1,
        'Title': item.title,
        'Filename': item.filename,
        'Description': item.description,
        'Keywords': item.keywords
      }))
    );

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Meta Tags');
    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, 'meta_tags_result.xlsx');
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFiles(Array.from(e.dataTransfer.files));
    }
  };

  const removeFile = (indexToRemove) => {
    setFiles(files.filter((_, index) => index !== indexToRemove));
  };

  return (
    <main className="min-h-screen p-8 bg-gray-100">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white shadow-lg rounded-xl p-4 mb-6 flex justify-between items-center">
          <h1 className="text-3xl font-bold text-blue-600">Meta Tag Generator</h1>
          <div className="flex items-center space-x-4">
            <span className="text-black">Credits: {userCredit}</span>
            <span className="text-black">{user?.email}</span>
          </div>
        </div>

        <div className="bg-white shadow-lg rounded-xl p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div
              className={`border-2 border-dashed rounded-lg p-6 text-center ${
                dragActive ? "border-blue-500 bg-blue-50" : "border-gray-300"
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
                id="file-upload"
              />
              <label
                htmlFor="file-upload"
                className="cursor-pointer flex flex-col items-center justify-center gap-2"
              >
                <Upload className="h-10 w-10 text-gray-400" />
                <p className="text-gray-600">
                  Drag and drop files here, or click to select files
                </p>
                <p className="text-sm text-gray-500">
                  Supports: JPG, PNG, WEBP
                </p>
              </label>
            </div>

            {/* File List */}
            {files.length > 0 && (
              <div className="mt-4 space-y-2">
                {files.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-2 bg-gray-50 rounded-md"
                  >
                    <span className="text-sm text-gray-600">
                      {file.name}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFile(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            <Button 
              type="submit" 
              disabled={loading || files.length === 0}
              className="w-full"
            >
              {loading ? 'Memproses...' : 'Generate Meta Tags'}
            </Button>
          </form>

          {results.length > 0 && (
            <div className="mt-8">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-black">Hasil:</h2>
                <div className="space-x-2">
                  <Button
                    onClick={exportToCSV}
                    variant="outline"
                    className="bg-green-500 text-white hover:bg-green-600"
                  >
                    Export CSV
                  </Button>
                  <Button
                    onClick={exportToXLSX}
                    variant="outline"
                    className="bg-blue-500 text-white hover:bg-blue-600"
                  >
                    Export XLSX
                  </Button>
                </div>
              </div>

              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>No</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead>Filename</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Keywords</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {results.map((result, index) => (
                      <TableRow key={index}>
                        <TableCell>{index + 1}</TableCell>
                        <TableCell>{result.title}</TableCell>
                        <TableCell>{result.filename}</TableCell>
                        <TableCell>{result.description}</TableCell>
                        <TableCell>{result.keywords}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
