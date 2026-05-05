// Utility to check if content has been extracted
export const hasExtractedContent = () => {
  const concepts = localStorage.getItem("extractedConcepts");
  const info = localStorage.getItem("extractedInfo");
  return concepts && info;
};

export const getExtractedConcepts = () => {
  const concepts = localStorage.getItem("extractedConcepts");
  return concepts ? JSON.parse(concepts) : [];
};

export const getExtractedInfo = () => {
  const info = localStorage.getItem("extractedInfo");
  return info ? JSON.parse(info) : null;
};

export const getExtractedDocumentId = () => {
  return localStorage.getItem("extractedDocumentId");
};
