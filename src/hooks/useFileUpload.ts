'use client';
import { useState } from 'react';
import { useStorage } from '@/firebase';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { useToast } from '@/hooks/use-toast';

export function useFileUpload() {
    const storage = useStorage();
    const { toast } = useToast();
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);

    const uploadFile = (file: File, path: string): Promise<string> => {
        return new Promise((resolve, reject) => {
            if (!storage) {
                toast({ variant: 'destructive', title: 'Error', description: 'Storage service not available.' });
                return reject('Storage service not available.');
            }

            setIsUploading(true);
            setUploadProgress(0);

            const storageRef = ref(storage, path);
            const uploadTask = uploadBytesResumable(storageRef, file);

            uploadTask.on('state_changed',
                (snapshot) => {
                    const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                    setUploadProgress(progress);
                },
                (error) => {
                    console.error("Upload error:", error);
                    toast({ variant: 'destructive', title: 'Upload Failed', description: error.message });
                    setIsUploading(false);
                    reject(error);
                },
                () => {
                    getDownloadURL(uploadTask.snapshot.ref).then((downloadURL) => {
                        setIsUploading(false);
                        resolve(downloadURL);
                    });
                }
            );
        });
    };

    return { isUploading, uploadProgress, uploadFile };
}
