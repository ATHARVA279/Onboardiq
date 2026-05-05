import api from "./backend";

export const getLibrary = async () => {
  const response = await api.get("/library");
  return response.data;
};

export const deleteDocument = async (id) => {
  const response = await api.delete(`/library/${id}`);
  return response.data;
};

export const extractUrl = async (url) => {
  const response = await api.post("/extract", { url });
  return response.data;
};

export const checkJobStatus = async (jobId) => {
  const response = await api.get(`/extract/status/${jobId}`);
  return response.data;
};
