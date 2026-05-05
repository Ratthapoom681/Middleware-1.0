import { useState } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import html2canvas from "html2canvas";

interface ExportPdfButtonProps {
  reportTitle: string;
  filename: string;
  targetId: string; // The ID of the container with charts to capture
  stats: { label: string; value: string | number }[];
  tableData?: {
    head: string[][];
    body: (string | number)[][];
  };
  recommendations?: string[];
  label?: string;
}

export function ExportPdfButton({
  reportTitle,
  filename,
  targetId,
  stats,
  tableData,
  recommendations = [
    "Monitor critical findings for immediate remediation.",
    "Perform a full system sync if data appears stale.",
    "Review active agents status periodically.",
  ],
  label = "Export PDF",
}: ExportPdfButtonProps) {
  const [loading, setLoading] = useState(false);

  const generatePdf = async () => {
    setLoading(true);
    try {
      const doc = jsPDF({ orientation: "p", unit: "mm", format: "a4" });
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 15;
      const contentWidth = pageWidth - margin * 2;
      const bottomMargin = 20;

      // 1. Strict Y-axis Cursor
      let currentY = margin;
      
      const checkPageBreak = (neededHeight: number) => {
        if (currentY + neededHeight > pageHeight - bottomMargin) {
          doc.addPage();
          currentY = margin + 15; // Reset cursor to top of new page (with header spacing)
          return true;
        }
        return false;
      };

      const dateStr = new Date().toLocaleString();

      // --- Header (Page 1) ---
      doc.setFillColor(79, 134, 255);
      doc.circle(margin + 8, currentY + 5, 8, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text("MW", margin + 8, currentY + 6.5, { align: "center", baseline: "middle" });

      doc.setTextColor(30, 41, 59);
      doc.setFontSize(18); // Main Title
      doc.text("Middleware-1.0", margin + 20, currentY + 8);
      
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100, 116, 139);
      doc.text(`Generated: ${dateStr}`, pageWidth - margin, currentY + 8, { align: "right" });
      
      currentY += 25; // Spacing after header
      
      doc.setFontSize(18);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(30, 41, 59);
      doc.text(reportTitle, pageWidth / 2, currentY, { align: "center" });
      currentY += 15; // Spacing after report title
      
      // --- Executive Summary ---
      currentY += 18; // Margin top for section
      checkPageBreak(10);
      doc.setFontSize(14); // Section Title
      doc.setFont("helvetica", "bold");
      doc.setTextColor(79, 134, 255);
      doc.text("1. Executive Summary", margin, currentY);
      currentY += 10; // Spacing after section title
      
      doc.setFontSize(10); // Body Text
      doc.setFont("helvetica", "normal");
      doc.setTextColor(51, 65, 85);
      const summaryText = "This report provides an automated overview of the current system state, security findings, and performance metrics as captured from the Middleware-1.0 dashboard. The data highlights key performance indicators (KPIs) and recent activities that require administrative attention.";
      const splitSummary = doc.splitTextToSize(summaryText, contentWidth);
      const summaryHeight = splitSummary.length * 5;
      checkPageBreak(summaryHeight);
      doc.text(splitSummary, margin, currentY);
      currentY += summaryHeight + 5; // Spacing after block

      // --- Key Statistics ---
      currentY += 18; // Margin top for section
      checkPageBreak(10);
      doc.setFontSize(14); // Section Title
      doc.setFont("helvetica", "bold");
      doc.setTextColor(79, 134, 255);
      doc.text("2. Key Statistics", margin, currentY);
      currentY += 10; // Spacing after section title

      const cardSpacing = 8;
      const cardsPerRow = 2;
      const cardWidth = (contentWidth - (cardSpacing * (cardsPerRow - 1))) / cardsPerRow;
      const cardHeight = 28; // Strict card height

      let statX = margin;
      
      for (let i = 0; i < stats.length; i++) {
        // Line break for grid
        if (i > 0 && i % cardsPerRow === 0) {
          statX = margin;
          currentY += cardHeight + cardSpacing; 
        }

        checkPageBreak(cardHeight); // Check if row fits

        const stat = stats[i];
        
        doc.setFillColor(248, 250, 252);
        doc.rect(statX, currentY, cardWidth, cardHeight, "F");
        
        doc.setFontSize(10); // Card Title
        doc.setTextColor(100, 116, 139);
        doc.setFont("helvetica", "normal");
        // Padding top 6, left 6 (adjusting for baseline)
        doc.text(stat.label, statX + 6, currentY + 6 + 3); 
        
        doc.setFontSize(16); // Card Value
        doc.setTextColor(30, 41, 59);
        doc.setFont("helvetica", "bold");
        // Positioning value cleanly below
        doc.text(String(stat.value), statX + 6, currentY + 16 + 5); 
        
        statX += cardWidth + cardSpacing;
      }
      
      if (stats.length > 0) {
        currentY += cardHeight;
      }
      currentY += 5; // Spacing after block

      // --- Charts Summary ---
      const chartElement = document.getElementById(targetId);
      if (chartElement) {
        currentY += 18; // Margin top for section
        checkPageBreak(20);
        doc.setFontSize(14); // Section Title
        doc.setFont("helvetica", "bold");
        doc.setTextColor(79, 134, 255);
        doc.text("3. Visual Analysis", margin, currentY);
        currentY += 10; // Spacing after section title

        const canvas = await html2canvas(chartElement, {
          backgroundColor: "#070d1a",
          scale: 2,
        });
        const imgData = canvas.toDataURL("image/png");
        let imgWidth = contentWidth;
        let imgHeight = (canvas.height * imgWidth) / canvas.width;
        
        const maxImgHeight = pageHeight - bottomMargin - margin - 15;
        if (imgHeight > maxImgHeight) {
           const ratio = maxImgHeight / imgHeight;
           imgHeight = maxImgHeight;
           imgWidth = imgWidth * ratio;
        }

        checkPageBreak(imgHeight + 10);
        doc.addImage(imgData, "PNG", margin, currentY, imgWidth, imgHeight);
        currentY += imgHeight + 5; // Spacing after block
      }

      // --- Tables ---
      let sectionNum = chartElement ? 4 : 3;
      if (tableData && tableData.body.length > 0) {
        currentY += 18; // Margin top for section
        checkPageBreak(20);
        doc.setFontSize(14); // Section Title
        doc.setFont("helvetica", "bold");
        doc.setTextColor(79, 134, 255);
        doc.text(`${sectionNum}. Detailed Records`, margin, currentY);
        currentY += 5; // Spacing after section title (reduced for table)

        autoTable(doc, {
          startY: currentY,
          head: tableData.head,
          body: tableData.body,
          theme: "striped",
          headStyles: { fillColor: [79, 134, 255], textColor: 255, fontStyle: 'bold' },
          styles: { font: 'helvetica', fontSize: 10, cellPadding: 4, overflow: 'linebreak' },
          margin: { left: margin, right: margin, bottom: bottomMargin },
          pageBreak: 'auto',
        });
        
        // Update cursor to immediately below the generated table
        currentY = (doc as any).lastAutoTable.finalY;
        sectionNum++;
      }

      // --- Recommendations ---
      if (recommendations && recommendations.length > 0) {
        currentY += 18; // Margin top for section
        checkPageBreak(20);
        doc.setFontSize(14); // Section Title
        doc.setFont("helvetica", "bold");
        doc.setTextColor(79, 134, 255);
        doc.text(`${sectionNum}. Recommendations`, margin, currentY);
        currentY += 10; // Spacing after section title

        doc.setFontSize(10); // Body Text
        doc.setFont("helvetica", "normal");
        doc.setTextColor(51, 65, 85);
        
        recommendations.forEach((rec) => {
          const splitRec = doc.splitTextToSize(`• ${rec}`, contentWidth - 5);
          const recHeight = splitRec.length * 5;
          checkPageBreak(recHeight + 5);
          doc.text(splitRec, margin + 5, currentY);
          currentY += recHeight + 3; // Spacing after line item
        });
      }

      // --- Render Global Header/Footer ---
      const pageCount = (doc as any).internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        
        if (i > 1) {
            doc.setFillColor(79, 134, 255);
            doc.circle(margin + 4, margin, 4, "F");
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(6);
            doc.setFont("helvetica", "bold");
            doc.text("MW", margin + 4, margin + 1, { align: "center", baseline: "middle" });

            doc.setTextColor(100, 116, 139);
            doc.setFontSize(8);
            doc.setFont("helvetica", "normal");
            doc.text(`Middleware-1.0 | ${reportTitle}`, margin + 12, margin + 1);
            doc.setDrawColor(226, 232, 240);
            doc.line(margin, margin + 5, pageWidth - margin, margin + 5);
        }

        doc.setDrawColor(226, 232, 240);
        doc.line(margin, pageHeight - bottomMargin + 5, pageWidth - margin, pageHeight - bottomMargin + 5);
        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184);
        doc.text("Middleware-1.0 Confidential", margin, pageHeight - 8);
        doc.text(`Page ${i} of ${pageCount}`, pageWidth - margin, pageHeight - 8, { align: "right" });
      }

      doc.save(`${filename}-${new Date().toISOString().split("T")[0]}.pdf`);
    } catch (error) {
      console.error("PDF Generation Error:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      className={`button ${loading ? "button--ghost" : "button--secondary"}`}
      onClick={generatePdf}
      disabled={loading}
    >
      {loading ? (
        <>
          <div className="spinner" />
          Processing...
        </>
      ) : (
        <>
          <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
          {label}
        </>
      )}
      <style>{`
        .spinner {
          width: 14px;
          height: 14px;
          border: 2px solid rgba(255,255,255,0.3);
          border-top-color: #fff;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </button>
  );
}
