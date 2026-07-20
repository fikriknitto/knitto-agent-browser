interface Window {
  __ENV__?: {
    [key: string]: string;
  };
}

interface IResponse<T = null> {
  message: string;
  result: T;
}

interface IPaginateResponse<T = null> {
  message: string;
  result: {
    data: T[];
    paginate: {
      page: number;
      perPage: number;
      totalItem: number;
      totalPage: number;
      sortBy: string;
      sortType: 'asc' | 'desc';
    };
    filter?: {
      [key: string]: string;
    };
  };
}

interface IPayloadPagination {
  search?: string;
  perPage: number;
  page: number;
  sortBy?: string;
  sortType?: 'asc' | 'desc';
}

interface IuseModal<TModalName> {
  show?: boolean;
  modalName?: TModalName;
}

interface IExcelColumnWidth {
  wch: number;
}

interface IuseParams {
  search?: string;
  perPage?: number;
  page?: number;
  tanggal_awal?: string;
  tanggal_akhir?: string;
  dateTime?: string;
}
