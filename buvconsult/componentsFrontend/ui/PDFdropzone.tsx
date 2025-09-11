"use client"


import React, {useCallback, useEffect, useRef, useState} from 'react'

import {
    DndContext,
    useSensors,
    useSensor,
    PointerSensor,

} from "@dnd-kit/core";
import { useKindeBrowserClient } from "@kinde-oss/kinde-auth-nextjs";
import {useRouter} from "next/navigation";
import {uploadPDF} from "@/actions/uploadPDF";


function PDFDropzone(){


    const [isUploading, setIsUploading] = useState(false)

    const [uploadFiles, setUploadedFiles] = useState<string[]>([])

    const fileInputRef = useRef<HTMLInputElement>(null)



    const router = useRouter()

    // Use Kinde's client side-authentication

    const { user, isAuthenticated, isLoading } = useKindeBrowserClient();

    const [isDraggingOver, setIsDraggingOver] = useState(false);

     // Redirect to login if not authenticated (after loading is complete)
    useEffect(() => {
        if (!isLoading && !isAuthenticated) {
            router.push("/");
        }
    }, [isLoading, isAuthenticated, router]);




    const sensors = useSensors(useSensor(PointerSensor))

    const handleDragOver = useCallback((e: React.DragEvent) => {

        e.preventDefault();
        setIsDraggingOver(true)
    }, [])

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDraggingOver(false)
    },[])

    const handleUpload = useCallback(async(files: FileList | File[]) => {
          if (!user){
            alert("Please sign in to upload files")
            return
        }


          const fileArray = Array.from(files);
          const pdfFiles = fileArray.filter(
              (file) =>
                  file.type === "application/pdf" ||
                  file.name.toLowerCase().endsWith(".pdf")
          )

        if (pdfFiles.length === 0){
            alert("Please drop only PDF files")
            return
        }

        setIsUploading(true)

        try {

            const newUploadedFiles: string[] = []

            for (const file of pdfFiles){

                // Create a formData object to use with the server action
                const formData = new FormData();
                formData.append("file",file)

                // Call the server action to handle the upload
                const result = await uploadPDF(formData)

                if(!result.success) {
                    throw new Error(result.error)
                }

                newUploadedFiles.push(file.name)

            }

            setUploadedFiles((prev)=>[...prev, ...newUploadedFiles])

            // Clear uploaded files list after 5 seconds

            setTimeout(() => {

                setUploadedFiles([])
            },5000)

            //redirect

            router.push("/receipts")



        }  catch (error){
            console.error("Upload failed:", error)
            alert(
                `Upload failed: ${error instanceof Error ? error.message : "Unknown error"}`
            )
        } finally{
            setIsUploading(false)
        }




        console.log(files)

    },[user,router])

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDraggingOver(false);
        console.log("Dropped")

        if (!user){
            alert("Please sign in to upload files")
            return
        }

        if (e.dataTransfer.files && e.dataTransfer.files.length>0){
            handleUpload(e.dataTransfer.files)
        }


    }, [user, handleUpload])

    const canUpload = true;




    return (

    <DndContext sensors={sensors}>
  <div className="w-full max-w-md mx-auto bg-red-400">
    <div
      onDragOver={canUpload ? handleDragOver : undefined}
      onDragLeave={canUpload ? handleDragLeave : undefined}
      onDrop={canUpload ? handleDrop : (e) => e.preventDefault()}
      className={`border-2 border-dashed rounded-lg p-8 text-center transition-color ${
        isDraggingOver ? "border-blue-500 bg-blue-50" : "border-gray-300"
      } ${!canUpload ? "opacity-70 cursor-not-allowed" : ""}`}
    >
      DROPZONE
    </div>
  </div>
</DndContext>
        )

}

export default PDFDropzone

