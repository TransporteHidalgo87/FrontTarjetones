import { Injectable } from "@angular/core"
import jsPDF from "jspdf"
import html2canvas from "html2canvas"

export interface TarjetonData {
  id: number
  folio: string
  operador: string
  emision: string
  vence: string,
  emisionAntigua: string // Nueva propiedad para la fecha de emisión antigua
  fechaAlta: string
  tipoTramite: string
  coordinacion: string
  nombreOperador: string
  genero: string
  municipio: string
  modalidad: string
  tipo: string
  estatus: string
  folioAdmon: string
  folioPago: string
  fotografia?: any
}

@Injectable({
  providedIn: "root",
})
export class PdfGeneratorService {
  constructor() { }

  async generateTarjetonPdf(tarjeton: TarjetonData): Promise<void> {
    let tempDivFrente: HTMLElement | null = null
    let tempDivReverso: HTMLElement | null = null

    try {
      // PDF con medidas específicas para impresión (independiente del HTML)
      const pdf = new jsPDF("p", "mm", [150, 212])

      // PÁGINA 1: Frente del tarjetón
      const htmlContentFrente = this.createPdfFrenteHtml(tarjeton)
      tempDivFrente = this.createTempElement(htmlContentFrente, "frente")
      document.body.appendChild(tempDivFrente)

      await this.waitForImages(tempDivFrente)

      const canvasFrente = await html2canvas(tempDivFrente, {
        scale: 3, // Mayor escala para mejor calidad en PDF
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#ffffff",
        width: 567, // 150mm a 96 DPI
        height: 800, // 212mm a 96 DPI
      })

      const imgDataFrente = canvasFrente.toDataURL("image/png", 1.0)
      pdf.addImage(imgDataFrente, "PNG", 0, 0, 150, 212)

      // PÁGINA 2: Reverso del tarjetón
      pdf.addPage()
      const htmlContentReverso = this.createPdfReversoHtml(tarjeton)
      tempDivReverso = this.createTempElement(htmlContentReverso, "reverso")
      document.body.appendChild(tempDivReverso)

      await this.waitForImages(tempDivReverso)

      const canvasReverso = await html2canvas(tempDivReverso, {
        scale: 3,
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#ffffff",
        width: 567,
        height: 800,
      })

      const imgDataReverso = canvasReverso.toDataURL("image/png", 1.0)
      pdf.addImage(imgDataReverso, "PNG", 0, 0, 150, 212)

      // Descargar el PDF
      pdf.save(`tarjeton-${tarjeton.folio}.pdf`)
    } catch (error) {
      console.error("Error al generar PDF:", error)
      throw error
    } finally {
      // Limpiar elementos temporales
      this.cleanupTempElement(tempDivFrente)
      this.cleanupTempElement(tempDivReverso)
    }
  }

  private createTempElement(htmlContent: string, type: string): HTMLElement {
    const tempDiv = document.createElement("div")
    tempDiv.innerHTML = htmlContent
    tempDiv.style.position = "absolute"
    tempDiv.style.left = "-9999px"
    tempDiv.style.top = "-9999px"
    tempDiv.style.width = "150mm"
    tempDiv.style.height = "212mm"
    tempDiv.style.backgroundColor = "white"
    tempDiv.style.overflow = "hidden"
    tempDiv.setAttribute(`data-temp-pdf-${type}`, "true")
    return tempDiv
  }

  private cleanupTempElement(element: HTMLElement | null): void {
    if (element && element.parentNode) {
      try {
        element.parentNode.removeChild(element)
      } catch (error) {
        console.warn("Error al remover elemento temporal:", error)
      }
    }
  }

  private waitForImages(container: HTMLElement): Promise<void> {
    const images = container.querySelectorAll("img")
    const promises = Array.from(images).map((img) => {
      return new Promise<void>((resolve) => {
        if (img.complete) {
          resolve()
        } else {
          img.onload = () => resolve()
          img.onerror = () => resolve()
          setTimeout(() => resolve(), 5000)
        }
      })
    })
    return Promise.all(promises).then(() => { })
  }
  /** 🔧 Convierte "DD/MM/YYYY" → Date (sin librerías externas) */
  private parseDDMMYYYY(fecha: string): Date {
    const [d, m, a] = fecha.split("/").map(Number)
    // mes - 1 porque en JS los meses van de 0 a 11
    return new Date(a, m - 1, d)
  }

 private calcularAntiguedad(
  en: string,
  tipoTramite: string
): number {
  if (tipoTramite === "Expedición") return 0;

  const fechaInicio = en.includes("/") ? this.parseDDMMYYYY(en) : new Date(en);
  const hoy = new Date();

  if (isNaN(fechaInicio.getTime()) || isNaN(hoy.getTime())) {
    console.warn("⚠️ Fechas inválidas:", { en });
    return 0;
  }

  const antiguedad = hoy.getFullYear() - fechaInicio.getFullYear();
  return antiguedad < 0 ? 0 : antiguedad;
}





  private convertBufferToBase64(buffer: any): string {
    if (!buffer || !buffer.data) return ""
    try {
      const bytes = new Uint8Array(buffer.data)
      let binary = ""
      for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i])
      }
      const base64 = btoa(binary)
      return `data:image/jpeg;base64,${base64}`
    } catch (error) {
      console.error("Error al convertir buffer a base64:", error)
      return ""
    }
  }

  private getCurrentDay(): string {
    return new Date().getDate().toString().padStart(2, "0")
  }

  private getCurrentMonth(): string {
    const meses = [
      "Enero",
      "Febrero",
      "Marzo",
      "Abril",
      "Mayo",
      "Junio",
      "Julio",
      "Agosto",
      "Septiembre",
      "Octubre",
      "Noviembre",
      "Diciembre",
    ]
    return meses[new Date().getMonth()]
  }

  private getCurrentYear(): string {
    return new Date().getFullYear().toString()
  }
  getEmisionDay(emision: string): string {
    if (!emision) return ""
    const [day] = emision.split("/")
    return day
  }

  getEmisionMonth(emision: string): string {
    if (!emision) return ""
    const [, month] = emision.split("/")
    const meses = [
      "enero", "febrero", "marzo", "abril", "mayo", "junio",
      "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"
    ]
    return meses[parseInt(month, 10) - 1] || ""
  }

  getEmisionYear(emision: string): string {
    if (!emision) return ""
    const [, , year] = emision.split("/")
    return year
  }


  // MÉTODOS ESPECÍFICOS PARA PDF (independientes del HTML)
  private createPdfFrenteHtml(tarjeton: TarjetonData): string {
    const fotografiaBase64 = this.convertBufferToBase64(tarjeton.fotografia)

    return `
      <div style="
        width: 150mm;
        height: 212mm;
        position: relative;
        margin: 0;
        padding: 0;
        background: white;
        font-family: Montserrat, sans-serif;
        box-sizing: border-box;
      ">
        <!-- Imagen de fondo del frente -->
        <img 
          src="assets/images/Frente.pdf (7).png"
          style="
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            object-fit: cover;
            z-index: 1;
          "
          crossorigin="anonymous"
        />
        
        <!-- Fotografía del operador - Medidas específicas para PDF -->
        <div style="
          position: absolute;
          top: 35mm; 
          left: 34mm;
          width: 70mm;
          height: 85mm;
          z-index: 2;
          background: white;
          border-radius: 4px;
          overflow: hidden;
        ">
          ${fotografiaBase64
        ? `
            <img 
              src="${fotografiaBase64}"
              style="
                width: 100%;
                height: 100%;
                object-fit: cover;
              "
              crossorigin="anonymous"
            />
          `
        : `
            <div style="
              width: 100%;
              height: 100%;
              display: flex;
              align-items: center;
              justify-content: center;
              background: #f3f4f6;
              color: #6b7280;
              font-size: 14px;
              font-weight: bold;
            ">
              SIN FOTOGRAFÍA
            </div>
          `
      }
        </div>

        <!-- Nombre del operador - Posición específica para PDF -->
<div style="
  position: absolute;
  top: 120mm;
  left: 15mm; /* Movido más a la izquierda */
  width: 120mm; /* Ancho máximo disponible */
  z-index: 3;
  background: rgba(255, 255, 255, 0.95);
  padding: 3mm;
  text-align: center;
  border-radius: 4px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
">
  <div style="
    font-size: 13px; /* Reducido ligeramente */
    font-weight: bold; 
    color: #000; 
    line-height: 1.3;
    text-transform: uppercase;
    white-space: nowrap;
    overflow: visible; /* Cambiado a visible */
  ">
    ${tarjeton.nombreOperador}
  </div>
</div>

        <!-- Información del Dr. - Posición específica para PDF -->
        <div style="
          position: absolute;
          top: 175mm;
          left: 18mm;
          width: 114mm;
          z-index: 3;
          background: rgba(255, 255, 255, 0.95);
          padding: 3mm;
          text-align: center;
          border-radius: 4px;
        ">
          <div style="font-size: 12px; font-weight: bold; color: #000; margin-bottom: 2mm;">
            Dr. José Antonio Pérez Sánchez
          </div>
          <div style="font-size: 10px; color: #000; line-height: 1.3; margin-bottom: 1mm;">
            Director general del STCH
          </div>
        </div>

        <!-- Vigencia - Posición específica para PDF -->
        <div style="
          position: absolute;
          top: 202mm;
          left: 38mm;
          z-index: 3;
          padding: 2mm 4mm;
          border-radius: 4px;
        ">
          <div style="font-size: 13px; font-weight: bold; color: #8B4513;">
            ${tarjeton.vence}
          </div>
        </div>
      </div>
    `
  }

  private createPdfReversoHtml(tarjeton: TarjetonData): string {
    const fotografiaBase64 = this.convertBufferToBase64(tarjeton.fotografia)
    const antiguedad = this.calcularAntiguedad(
      tarjeton.emisionAntigua,
      tarjeton.tipoTramite,
    )


    return `
      <div style="
        width: 150mm;
        height: 212mm;
        position: relative;
        margin: 0;
        padding: 0;
        background: white;
        font-family: Montserrat, sans-serif;
        box-sizing: border-box;
      ">
        <!-- Imagen de fondo del reverso -->
        <img 
          src="assets/images/tarjeton-reverso1.jpg"
          style="
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            object-fit: cover;
            z-index: 1;
          "
          crossorigin="anonymous"
        />
        
        <!-- Fotografía del operador en reverso - Misma posición -->
        <div style="
          position: absolute;
          top: 35mm;
          left: 34mm;
          width: 70mm;
          height: 85mm;
          z-index: 2;
          background: white;

          border-radius: 4px;
          overflow: hidden;
        ">
          ${fotografiaBase64
        ? `
            <img 
              src="${fotografiaBase64}"
              style="
                width: 100%;
                height: 100%;
                object-fit: cover;
              "
              crossorigin="anonymous"
            />
          `
        : `
            <div style="
              width: 100%;
              height: 100%;
              display: flex;
              align-items: center;
              justify-content: center;
              color: #6b7280;
              font-size: 12px;
            ">
              Sin foto
            </div>
          `
      }
        </div>

<!-- Nombre del operador - Posición específica para PDF -->
<div style="
  position: absolute;
  top: 118mm;
  left: 15mm; /* Movido más a la izquierda */
  width: 120mm; /* Ancho máximo disponible */
  z-index: 3;
  padding: 3mm;
  text-align: center;
  border-radius: 4px;
">
  <div style="
    font-size: 13px; /* Reducido ligeramente */
    font-weight: bold; 
    color: #000; 
    line-height: 1.3;
    text-transform: uppercase;
    white-space: nowrap;
    overflow: visible; /* Cambiado a visible */
  ">
    ${tarjeton.nombreOperador}
  </div>
</div>
        
        <!-- Datos del tarjetón - Posiciones específicas para PDF -->
        <div style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; z-index: 3;">
          
          <!-- Folio de Operador -->
          <div style="
            position: absolute;
            top: 125mm;
            left: 19mm;
            padding: 2mm 3mm;
            border-radius: 3px;
          ">
            <span style="font-size: 11px; color: #374151; font-weight: 500;">Folio de Operador: </span>
            <span style="font-size: 11px; font-weight: bold; color: #000;">${tarjeton.operador}</span>
          </div>

          <!-- Municipio -->
          <div style="
            position: absolute;
            top: 132mm;
            left: 19mm;
            padding: 2mm 3mm;
            border-radius: 3px;
          ">
            <span style="font-size: 11px; color: #374151; font-weight: 500;">Municipio: </span>
            <span style="font-size: 11px; font-weight: bold; color: #000;">${tarjeton.municipio}</span>
          </div>

          <!-- Tipo de Trámite -->
          <div style="
            position: absolute;
            top: 139mm;
            left: 19mm;
            padding: 2mm 3mm;
            border-radius: 3px;
          ">
            <span style="font-size: 11px; color: #374151; font-weight: 500;">Tipo de Trámite: </span>
            <span style="font-size: 11px; font-weight: bold; color: #000;">${tarjeton.tipoTramite}</span>
          </div>

          <!-- Modalidad -->
          <div style="
            position: absolute;
            top: 146mm;
            left: 19mm;
            padding: 2mm 3mm;
            border-radius: 3px;
          ">
            <span style="font-size: 11px; color: #374151; font-weight: 500;">Modalidad: </span>
            <span style="font-size: 11px; font-weight: bold; color: #000;">${tarjeton.modalidad}</span>
          </div>

          <!-- Tipo de Tarjetón -->
          <div style="
            position: absolute;
            top: 153mm;
            left: 19mm;
            padding: 2mm 3mm;
            border-radius: 3px;
          ">
            <span style="font-size: 11px; color: #374151; font-weight: 500;">Tipo de Tarjetón: </span>
            <span style="font-size: 11px; font-weight: bold; color: #000;">${tarjeton.tipo}</span>
          </div>

          <!-- Antigüedad -->
          <div style="
            position: absolute;
            top: 160mm;
            left: 19mm;
            padding: 2mm 3mm;
            border-radius: 3px;
          ">
          
            <span style="font-size: 11px; color: #374151; font-weight: 500;">Antigüedad: </span>
          <span style="font-size: 11px; font-weight: bold; color: #000;">
            ${antiguedad} ${antiguedad === 1 ? "año" : "años"}
          </span>
          </div>

          <!-- Fecha y lugar -->
          <div style="
            position: absolute;
            top: 167mm;
            left: 19mm;
            padding: 2mm 3mm;
            border-radius: 3px;
            width: 106mm;
          ">
            <span style="font-size: 11px; color: #374151;">Pachuca de Soto, Hidalgo a </span>
    <span style="font-size: 11px; font-weight: bold; color: #000;">${this.getEmisionDay(tarjeton.emision)}</span>
    <span style="font-size: 11px; color: #374151;"> de </span>
    <span style="font-size: 11px; font-weight: bold; color: #000;">${this.getEmisionMonth(tarjeton.emision)}</span>
    <span style="font-size: 11px; color: #374151;"> del </span>
    <span style="font-size: 11px; font-weight: bold; color: #000;">${this.getEmisionYear(tarjeton.emision)}</span>
          </div>

          <!-- Texto Legal -->
          <div style="
            position: absolute;
            top: 175mm;
            left: 19mm;
            width: 106mm;
            padding: 3mm;
            border-radius: 3px;
          ">
            <p style="
              font-size: 10px; 
              color: #374151; 
              line-height: 1.3; 
              text-align: justify; 
              margin: 0;
            ">
              El Titular del presente documento, es sujeto obligado a lo establecido en los numerales 9
              fracción I, V, XVII, XXVI, 10, 17, 19, 112 al 122, 151, 152 y 154 de la Ley de Movilidad y
              Transporte para el Estado de Hidalgo; 109 al 125 del Reglamento de Ley de Movilidad y
              Transporte para el Estado de Hidalgo.
            </p>
          </div>

          <!-- Vigencia -->
          <div style="
            position: absolute;
            top: 202mm;
            left: 38mm;
            padding: 2mm 4mm;
            border-radius: 4px;
          ">
            <div style="font-size: 13px; font-weight: bold; color: #8B4513;">
               ${tarjeton.vence}
            </div>
          </div>
        </div>
      </div>
    `
  }
}
