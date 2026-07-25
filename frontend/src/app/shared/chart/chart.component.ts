import { Component, ElementRef, Input, ViewChild, AfterViewInit, OnDestroy, OnChanges, SimpleChanges, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Chart, ChartConfiguration, ChartTypeRegistry, registerables } from 'chart.js';

Chart.register(...registerables);

@Component({
  selector: 'acl-chart',
  standalone: true,
  template: `<canvas #canvas></canvas>`,
  styles: [`:host { display: block; position: relative; width: 100%; height: 100%; } canvas { width: 100% !important; height: 100% !important; }`]
})
export class ChartComponent implements AfterViewInit, OnDestroy, OnChanges {
  @ViewChild('canvas') canvasRef!: ElementRef<HTMLCanvasElement>;
  
  @Input() type: keyof ChartTypeRegistry = 'bar';
  @Input() data: any;
  @Input() options: any = {};
  
  private chart: Chart | null = null;
  private platformId = inject(PLATFORM_ID);

  ngAfterViewInit() {
    if (isPlatformBrowser(this.platformId)) {
      this.initChart();
    }
  }

  ngOnChanges(changes: SimpleChanges) {
    if (this.chart && (changes['data'] || changes['options'] || changes['type'])) {
      if (changes['type']) {
        this.destroyChart();
        this.initChart();
      } else {
        this.chart.data = this.data;
        if (this.options) {
          this.chart.options = { ...this.chart.options, ...this.options };
        }
        this.chart.update();
      }
    }
  }

  private initChart() {
    if (!this.canvasRef || !this.data) return;
    
    this.chart = new Chart(this.canvasRef.nativeElement, {
      type: this.type,
      data: this.data,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        ...this.options
      }
    });
  }

  private destroyChart() {
    if (this.chart) {
      this.chart.destroy();
      this.chart = null;
    }
  }

  ngOnDestroy() {
    this.destroyChart();
  }
}
