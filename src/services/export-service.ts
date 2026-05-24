
'use client';

import * as XLSX from 'xlsx';

/**
 * Service to handle tactical export of financial documents.
 */
export const exportService = {
    /**
     * Generates a high-density Excel spreadsheet.
     */
    toExcel(data: any) {
        const headers = ["Description", "Quantity", "Unit Price", "Subtotal"];
        const rows = data.items.map((i: any) => [
            i.description,
            i.quantity,
            i.unitPrice,
            i.quantity * i.unitPrice
        ]);

        const worksheetData = [
            [data.title],
            [`Ref: ${data.serialNo}`],
            [`Date: ${data.date}`],
            [`Client: ${data.clientName}`],
            [],
            headers,
            ...rows,
            [],
            ["", "", "GRAND TOTAL", `${data.currency}${data.total.toLocaleString()}`]
        ];

        const ws = XLSX.utils.aoa_to_sheet(worksheetData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Financial Record");
        XLSX.writeFile(wb, `${data.serialNo}_Finance_Record.xlsx`);
    },

    /**
     * Generates a Word-compatible document via HTML blob conversion.
     * This allows for complex styling and customized templates.
     */
    toWord(data: any) {
        const html = `
            <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
            <head><meta charset='utf-8'><title>Invoice</title>
            <style>
                body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; }
                .header { text-align: center; border-bottom: 2px solid #3b82f6; padding-bottom: 20px; margin-bottom: 30px; }
                .title { font-size: 24pt; font-weight: bold; color: #1e293b; }
                .meta { margin-bottom: 40px; }
                .table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
                .table th { background: #f8fafc; border-bottom: 1px solid #e2e8f0; padding: 10px; text-align: left; font-size: 10pt; text-transform: uppercase; }
                .table td { padding: 10px; border-bottom: 1px solid #f1f5f9; font-size: 11pt; }
                .total { text-align: right; font-size: 18pt; font-weight: bold; color: #3b82f6; }
                .footer { margin-top: 50px; border-top: 1px solid #e2e8f0; padding-top: 20px; font-size: 9pt; color: #64748b; }
            </style>
            </head>
            <body>
                <div class="header">
                    <div class="title">${data.config.header_text || data.title}</div>
                    <p>${data.config.company_address || ''}</p>
                </div>
                
                <div class="meta">
                    <p><strong>Reference:</strong> ${data.serialNo}</p>
                    <p><strong>Date:</strong> ${data.date}</p>
                    <p><strong>Client:</strong> ${data.clientName}</p>
                </div>

                <table class="table">
                    <thead>
                        <tr>
                            <th>Description</th>
                            <th>Qty</th>
                            <th>Unit Price</th>
                            <th>Amount</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${data.items.map((i: any) => `
                            <tr>
                                <td>${i.description}</td>
                                <td>${i.quantity}</td>
                                <td>${data.currency}${i.unitPrice.toLocaleString()}</td>
                                <td>${data.currency}${(i.quantity * i.unitPrice).toLocaleString()}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>

                <div class="total">
                    TOTAL: ${data.currency}${data.total.toLocaleString()}
                </div>

                <div class="footer">
                    <p><strong>Terms:</strong> ${data.config.terms_conditions || 'Payable upon receipt.'}</p>
                    <p>${data.config.footer_text || ''}</p>
                </div>
            </body>
            </html>
        `;

        const blob = new Blob(['\ufeff', html], {
            type: 'application/msword'
        });

        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${data.serialNo}_Invocie.doc`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
};
