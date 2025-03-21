'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation';
import supabase from '@/lib/supabase';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { Button } from "@/components/ui/button"
import { Upload, X, Copy } from "lucide-react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ChevronDown, LogOut } from "lucide-react"

export default function Home() {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);
  const [user, setUser] = useState(null);
  const [userCredit, setUserCredit] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  const navigate = useRouter();

  const copyToClipboard = (value) => {
    navigator.clipboard.writeText(value).then(() => {

    });
  };

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
      if (!data?.user) navigate.push("/login");
      else {
        setUser(data.user);
        fetchUserCredit(data.user.email);
      }
    });
  }, [navigate]);

  const handleFileChange = (e) => {
    const newFiles = Array.from(e.target.files);
    setFiles(prevFiles => [...prevFiles, ...newFiles]); // Tambahkan file baru ke array yang sudah ada
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
      const newFiles = Array.from(e.dataTransfer.files);
      setFiles(prevFiles => [...prevFiles, ...newFiles]); // Tambahkan file baru ke array yang sudah ada
    }
  };

  const removeFile = (indexToRemove) => {
    setFiles(files.filter((_, index) => index !== indexToRemove));
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      navigate.push('/login');
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  return (
    <main className="min-h-screen p-8 bg-gray-100">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white shadow-sm rounded-xl p-4 mb-6 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-grey-900">Metadata Generator with AI</h1>
          <div className="flex items-center space-x-4">
            <span className="text-black">Credits: {userCredit}</span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  className="flex items-center gap-2 px-2"
                >
                  <span className="text-black">{user?.email}</span>
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem
                  onClick={handleLogout}
                  className="text-red-600 cursor-pointer flex items-center gap-2"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Logout</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <div className="bg-white shadow-sm rounded-xl p-6">
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
                accept="image/png, image/jpeg, image/jpg"
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
                  Drag and drop images here, or click to select images
                </p>
                <p className="text-sm text-gray-500">
                  Supports: JPG, PNG
                </p>
              </label>
            </div>

            {/* File List dengan Preview */}
            {files.length > 0 && (
              <div className="mt-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-10 gap-4">
                {files.map((file, index) => (
                  <div
                    key={index}
                    className="relative group border rounded-lg p-2 hover:bg-gray-50"
                  >
                    {/* Preview Image */}
                    <div className="w-[70px] h-[70px] mb-2 overflow-hidden rounded-md bg-gray-100">
                      <img
                        src={URL.createObjectURL(file)}
                        width="20px"
                        alt={file.name}
                        className="w-full h-full object-cover"
                        onLoad={(e) => URL.revokeObjectURL(e.target.src)} // Cleanup URL after load
                      />
                    </div>
                    
                    {/* Filename */}
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm text-gray-600 truncate">
                        {file.name}
                      </p>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => removeFile(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
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
                    className="bg-green-800 text-white hover:bg-green-900 hover:text-white"
                  >
                    Export CSV
                  </Button>
                  <Button
                    onClick={exportToXLSX}
                    variant="outline"
                    className="bg-blue-800 text-white hover:bg-blue-900 hover:text-white"
                  >
                    Export XLSX
                  </Button>
                </div>
              </div>

              <div className="overflow-x-auto rounded-lg border border-grey-500">
  <Table className="w-full">
    <TableHeader className="rounded-lg">
      <TableRow className="rounded-lg">
        <TableHead className="w-[50px]">No</TableHead>
        <TableHead>Filename</TableHead>
        <TableHead>Title</TableHead>
        <TableHead className="w-[300px]">Description</TableHead>
        <TableHead className="w-[300px]">Keywords</TableHead>
      </TableRow>
    </TableHeader>
    <TableBody>
      {results.map((result, index) => (
        <TableRow key={index}>
          <TableCell>{index + 1}</TableCell>
          <TableCell className="whitespace-normal break-words relative">
        <Button variant="ghost" size="icon" onClick={() => copyToClipboard(result.filename)} className="absolute top-0 right-0">
        <Copy className="h-4 w-4" /></Button>
        {result.filename}
            </TableCell>
          <TableCell className="whitespace-normal break-words relative">        <Button variant="ghost" size="icon" onClick={() => copyToClipboard(result.title)} className="absolute top-0 right-0">
        <Copy className="h-4 w-4" /></Button>{result.title}</TableCell>
          <TableCell className="whitespace-normal break-words relative">        <Button variant="ghost" size="icon" onClick={() => copyToClipboard(result.description)} className="absolute top-0 right-0">
          <Copy className="h-4 w-4" /></Button>{result.description}</TableCell>
          <TableCell className="whitespace-normal break-words relative">        <Button variant="ghost" size="icon" onClick={() => copyToClipboard(result.keywords)} className="absolute top-0 right-0">
          <Copy className="h-4 w-4" /></Button>{result.keywords}</TableCell>
        </TableRow>
      ))}
    </TableBody>
  </Table>
</div>

            </div>
          )}
        </div>

        {/* Footer */}
        <footer className="mt-8 p-4 bg-white shadow-md text-center rounded-lg">
          <p className="text-sm text-gray-600">
            &copy; 2025 by 
            <a 
              href="https://instagram.com/mujibanget" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="text-grey-900 hover:underline"
            > @mujibanget
            </a>
          </p>
        </footer>
      </div>
    </main>
  );
} 
