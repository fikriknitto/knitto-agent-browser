import { TableCell, TableRow } from '../table';

export default function EmptyDataTable({ colSpan = 2, searched = '' }: { colSpan?: number; searched?: string }) {
  return (
    <TableRow>
      <TableCell colSpan={colSpan}>
        <div className="flex justify-center items-center h-[6.25rem] w-full text-black-40 dark:text-greyish-semi-white/60">
          {searched ? (
            <div className="flex gap-x-1 text-sm">
              <span className="font-semibold">{"'" + searched + "'"}</span> tidak ditemukan
            </div>
          ) : (
            'Data tidak tersedia'
          )}
        </div>
      </TableCell>
    </TableRow>
  );
}
