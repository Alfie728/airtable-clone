export interface SerializedBase {
  id: string;
  name: string;
  description: string | null;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export interface BaseResponse {
  success: boolean;
  error?: string;
  base?: SerializedBase;
}

export interface BaseListResponse {
  success: boolean;
  error?: string;
  bases?: SerializedBase[];
}
