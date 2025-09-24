// File: src/app/menu/quadrants/confirmats/components/ConfirmedTable.tsx

import React from 'react';
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { ConfirmedQuadrant } from '@/app/menu/quadrants/hooks/useQuadrantsConfirmed';

interface ConfirmedTableProps {
  confirmed: ConfirmedQuadrant[];
}

export default function ConfirmedTable({ confirmed }: ConfirmedTableProps) {
  const router = useRouter();

  return (
    <Table>
      <TableHeader className="bg-green-50">
        <TableRow>
          <TableHead className="px-4 py-2 text-left">Codi</TableHead>
          <TableHead className="px-4 py-2 text-left">Esdeveniment</TableHead>
          <TableHead className="px-4 py-2 text-left">Departament</TableHead>
          <TableHead className="px-4 py-2 text-left">Data / Hora</TableHead>
          <TableHead className="px-4 py-2 text-center">Accions</TableHead>
        </TableRow>
      </TableHeader>

      <TableBody>
        {confirmed.map(item => (
          <TableRow key={item.id} className="hover:bg-gray-50">
            <TableCell className="px-4 py-3">{item.code}</TableCell>
            <TableCell className="px-4 py-3 whitespace-normal">{item.eventName}</TableCell>
            <TableCell className="px-4 py-3">{item.department}</TableCell>
            <TableCell className="px-4 py-3">
              {item.startDate} {item.startTime} –<br />
              {item.endDate} {item.endTime}
            </TableCell>
            <TableCell className="px-4 py-3 text-center">
              <Button
                size="sm"
                variant="outline"
                onClick={() => router.push(`/menu/quadrants/confirmats/${item.id}`)}
              >
                Edita
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
