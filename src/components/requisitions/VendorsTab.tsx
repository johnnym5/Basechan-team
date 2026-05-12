'use client';

import { useState } from 'react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, where, orderBy } from 'firebase/firestore';
import type { Vendor, UserProfile } from '@/lib/types';
import type { Permissions } from '@/hooks/usePermissions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PlusCircle, Search, Mail, Phone, MapPin, Star } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { AddVendorDialog } from './AddVendorDialog';

interface VendorsTabProps {
    userProfile: UserProfile;
    permissions: Permissions;
}

export function VendorsTab({ userProfile, permissions }: VendorsTabProps) {
    const firestore = useFirestore();
    const [searchTerm, setSearchTerm] = useState('');
    const [isAddOpen, setIsAddOpen] = useState(false);

    const vendorsQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        return query(
            collection(firestore, 'vendors'),
            where('orgId', '==', userProfile.orgId),
            orderBy('name', 'asc')
        );
    }, [firestore, userProfile.orgId]);

    const { data: vendors, isLoading } = useCollection<Vendor>(vendorsQuery);

    const filteredVendors = vendors?.filter(v => 
        v.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.category.toLowerCase().includes(searchTerm.toLowerCase())
    ) || [];

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                <div className="relative w-full sm:max-w-xs">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                        placeholder="Search vendors..." 
                        className="pl-10"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                {permissions.canManageStaff && (
                    <Button onClick={() => setIsAddOpen(true)}>
                        <PlusCircle className="mr-2 h-4 w-4" /> Add Vendor
                    </Button>
                )}
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Supplier Directory</CardTitle>
                    <CardDescription>Verified external partners and service providers.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Vendor Name</TableHead>
                                <TableHead>Category</TableHead>
                                <TableHead>Contact</TableHead>
                                <TableHead>Rating</TableHead>
                                <TableHead className="text-right">Status</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading && Array.from({length: 5}).map((_, i) => (
                                <TableRow key={i}><TableCell colSpan={5}><Skeleton className="h-6 w-full" /></TableCell></TableRow>
                            ))}
                            {!isLoading && filteredVendors.length === 0 && (
                                <TableRow><TableCell colSpan={5} className="text-center py-10 text-muted-foreground">No vendors found.</TableCell></TableRow>
                            )}
                            {filteredVendors.map(vendor => (
                                <TableRow key={vendor.id}>
                                    <TableCell className="font-semibold">{vendor.name}</TableCell>
                                    <TableCell><Badge variant="secondary">{vendor.category}</Badge></TableCell>
                                    <TableCell>
                                        <div className="text-xs space-y-1">
                                            <div className="flex items-center gap-1.5"><Mail className="h-3 w-3" /> {vendor.email}</div>
                                            <div className="flex items-center gap-1.5"><Phone className="h-3 w-3" /> {vendor.phone}</div>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-1">
                                            <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                                            <span className="text-sm font-bold">{vendor.rating.toFixed(1)}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Badge className={vendor.isActive ? "bg-emerald-500/10 text-emerald-500" : "bg-muted text-muted-foreground"}>
                                            {vendor.isActive ? 'Active' : 'Inactive'}
                                        </Badge>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <AddVendorDialog 
                open={isAddOpen} 
                onOpenChange={setIsAddOpen} 
                userProfile={userProfile} 
            />
        </div>
    );
}
