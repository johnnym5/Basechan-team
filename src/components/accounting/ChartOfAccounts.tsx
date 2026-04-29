'use client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "../ui/skeleton";
import type { Account, UserProfile } from "@/lib/types";
import type { Permissions } from "@/hooks/usePermissions";
import { useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { collection, query, where, orderBy } from "firebase/firestore";
import { Button } from "../ui/button";
import { PlusCircle } from "lucide-react";

interface ChartOfAccountsProps {
  userProfile: UserProfile;
  permissions: Permissions;
}

export function ChartOfAccounts({ userProfile, permissions }: ChartOfAccountsProps) {
  const firestore = useFirestore();

  const accountsQuery = useMemoFirebase(() => {
    if (!firestore || !userProfile) return null;
    return query(
      collection(firestore, 'accounts'),
      where('orgId', '==', userProfile.orgId),
      orderBy('code', 'asc')
    );
  }, [firestore, userProfile]);

  const { data: accounts, isLoading } = useCollection<Account>(accountsQuery);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
            <CardTitle>Chart of Accounts</CardTitle>
            <CardDescription>The complete list of financial accounts for your organization.</CardDescription>
        </div>
        {permissions.canManageAccounting && (
            <Button variant="outline">
                <PlusCircle className="mr-2 h-4 w-4" />
                Add Account
            </Button>
        )}
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[100px]">Code</TableHead>
              <TableHead>Account Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Category</TableHead>
              <TableHead className="text-right">Balance</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={i}>
                <TableCell colSpan={5}><Skeleton className="h-6 w-full" /></TableCell>
              </TableRow>
            ))}
            {!isLoading && accounts?.length === 0 && (
              <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
                      No accounts configured yet.
                  </TableCell>
              </TableRow>
            )}
            {!isLoading && accounts?.map(account => (
              <TableRow key={account.id}>
                <TableCell className="font-mono">{account.code}</TableCell>
                <TableCell className="font-medium">{account.name}</TableCell>
                <TableCell className="text-muted-foreground capitalize">{account.type.toLowerCase()}</TableCell>
                <TableCell className="text-muted-foreground">{account.category}</TableCell>
                <TableCell className="text-right font-mono">{account.balance.toFixed(2)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
