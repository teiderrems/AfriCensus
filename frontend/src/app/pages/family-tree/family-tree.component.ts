import { SelectComponent } from '@/app/shared/select/select.component';
import { LucideAngularModule } from 'lucide-angular';
import { Component, HostListener, OnInit, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { ApiService } from '@/app/core/api.service';
import { I18nService } from '@/app/core/i18n/i18n.service';
import { CensusRecord, FamilyTree, FamilyTreeLink, FamilyTreeNode } from '@/app/core/models';
import { PageSizeSelectComponent } from '@/app/shared/page-size-select/page-size-select.component';
import { TablePaginationComponent } from '@/app/shared/table-pagination/table-pagination.component';
import { CardComponent } from '@/app/shared/card/card.component';
import { ButtonComponent } from '@/app/shared/button/button';
import { AclTooltipDirective } from '@/app/shared/tooltip/tooltip';
type PositionedNode = FamilyTreeNode & { x: number; y: number };
type NodePositions = Record<string, { x: number; y: number }>;
type LinkOffsets = Record<string, { dx: number; dy: number; tx?: number }>;

@Component({
  selector: 'acl-family-tree-page',
  imports: [LucideAngularModule, FormsModule, PageSizeSelectComponent, TablePaginationComponent, SelectComponent, CardComponent, ButtonComponent, AclTooltipDirective],
  styleUrl: './family-tree.component.css',
  templateUrl: "./family-tree.component.html"
})
export class FamilyTreeComponent implements OnInit {
  personOptions = computed(() => this.persons().map(p => ({ label: p.first_name + ' ' + p.last_name + ' (' + p.household_code + ')', value: p.id })));
  relationCategoryOptions = computed(() => [
    { label: this.i18n.t('family.category.all'), value: '' },
    { label: this.i18n.t('family.category.immediate'), value: 'immediate' },
    { label: this.i18n.t('family.category.extended'), value: 'extended' },
    { label: this.i18n.t('family.category.in_law'), value: 'in_law' }
  ]);

  readonly persons = signal<CensusRecord[]>([]);
  readonly selectedPersonId = signal('');
  readonly tree = signal<FamilyTree | null>(null);
  readonly selectedNode = signal<PositionedNode | null>(null);
  readonly scale = signal(1);
  readonly translateX = signal(0);
  readonly translateY = signal(0);
  readonly manualPositions = signal<NodePositions>({});
  readonly manualLinkOffsets = signal<LinkOffsets>({});
  readonly draggedNodeId = signal<string | null>(null);
  readonly draggedLinkId = signal<string | null>(null);
  readonly depth = signal(2);
  readonly depthOptions = [0, 1, 2, 3, 4, 5, 6].map(v => ({ label: v.toString(), value: v }));
  readonly pageSizes = [5, 10, 20, 50];
  readonly showTable = signal(true);
  readonly showDetails = signal(true);
  readonly showExportMenu = signal(false);
  readonly relationSearch = signal('');
  readonly relationCategoryFilter = signal('');
  readonly relationPage = signal(1);
  readonly relationPageSize = signal(10);
  readonly filteredRelationLinks = computed(() => {
    const query = this.relationSearch().trim().toLowerCase();
    const category = this.relationCategoryFilter();
    return (this.tree()?.links || []).filter((link) => {
      const matchesCategory = !category || link.category === category;
      const searchable = `${this.labelFor(link.source)} ${this.labelFor(link.target)} ${link.type} ${this.labelCategory(link.category)} ${link.status || ''}`.toLowerCase();
      return matchesCategory && (!query || searchable.includes(query));
    });
  });
  readonly relationTotalPages = computed(() => Math.max(1, Math.ceil(this.filteredRelationLinks().length / this.relationPageSize())));
  readonly pagedRelationLinks = computed(() => {
    const start = (Math.min(this.relationPage(), this.relationTotalPages()) - 1) * this.relationPageSize();
    return this.filteredRelationLinks().slice(start, start + this.relationPageSize());
  });
  private panStart: { x: number; y: number; tx: number; ty: number } | null = null;
  private nodeDragStart: { id: string; offsetX: number; offsetY: number } | null = null;
  private linkDragStart: { id: string; offsetX: number; offsetY: number } | null = null;
  private targetDragStart: { id: string; offsetX: number } | null = null;

  constructor(private readonly api: ApiService, readonly i18n: I18nService) { }

  ngOnInit(): void {
    this.api.persons().subscribe({
      next: (persons) => {
        this.persons.set(persons.items);
        if (persons.items.length) {
          this.selectPerson(persons.items[0].id);
        }
      },
      error: () => this.persons.set([]),
    });
  }

  selectPerson(personId: string): void {
    if (!personId) {
      return;
    }
    this.selectedPersonId.set(personId);
    this.api.familyTree(personId, this.depth()).subscribe({
      next: (tree) => {
        this.tree.set(tree);
        this.manualPositions.set({});
        this.manualLinkOffsets.set({});
        this.relationPage.set(1);
        this.resetView();
        this.selectedNode.set(this.layoutNodes().find((node) => node.id === tree.root.id) || null);
      },
      error: () => {
        this.tree.set(null);
        this.selectedNode.set(null);
      },
    });
  }

  setRelationSearch(value: string): void {
    this.relationSearch.set(value);
    this.relationPage.set(1);
  }

  setRelationCategoryFilter(value: string): void {
    this.relationCategoryFilter.set(value);
    this.relationPage.set(1);
  }

  setRelationPageSize(value: number | string): void {
    this.relationPageSize.set(Number(value));
    this.relationPage.set(1);
  }

  previousRelationPage(): void {
    this.relationPage.set(Math.max(1, this.relationPage() - 1));
  }

  nextRelationPage(): void {
    this.relationPage.set(Math.min(this.relationTotalPages(), this.relationPage() + 1));
  }

  setDepth(value: number | string): void {
    const nextDepth = Math.min(6, Math.max(0, Number(value)));
    this.depth.set(Number.isNaN(nextDepth) ? 2 : nextDepth);
    if (this.selectedPersonId()) {
      this.selectPerson(this.selectedPersonId());
    }
  }

  layoutNodes(): PositionedNode[] {
    const tree = this.tree();
    if (!tree) {
      return [];
    }
    const groups: Array<{ name: FamilyTreeNode['group']; y: number; fallback: FamilyTreeNode[] }> = [
      { name: 'parent', y: 90, fallback: [] },
      { name: 'sibling', y: 255, fallback: [] },
      { name: 'spouse', y: 255, fallback: [] },
      { name: 'root', y: 255, fallback: [tree.root] },
      { name: 'child', y: 440, fallback: [] },
      { name: 'relative', y: 545, fallback: [] },
    ];
    const nodes: PositionedNode[] = [];
    for (const group of groups) {
      const source = tree.nodes.filter((node) => node.group === group.name);
      const row = source.length ? source : group.fallback;
      const centered = this.centerRow(row, group.y);
      nodes.push(...centered);
    }
    const positions = this.manualPositions();
    return this.uniqueNodes(nodes).map((node) => {
      const manual = positions[node.id];
      return manual ? { ...node, x: manual.x, y: manual.y } : node;
    });
  }

  visibleLinks(): FamilyTreeLink[] {
    const ids = new Set(this.layoutNodes().map((node) => node.id));
    return this.tree()?.links.filter((link) => ids.has(link.source) && ids.has(link.target)) || [];
  }

  nodeById(id: string): PositionedNode | undefined {
    return this.layoutNodes().find((node) => node.id === id);
  }

  toggleDetails(): void {
    this.showDetails.set(!this.showDetails());
  }

  toggleExportMenu(event?: Event): void {
    event?.stopPropagation();
    this.showExportMenu.set(!this.showExportMenu());
  }

  @HostListener('document:click')
  onDocumentClick(): void {
    if (this.showExportMenu()) {
      this.showExportMenu.set(false);
    }
  }

  triggerExport(type: 'svg' | 'png' | 'pdf' | 'csv' | 'json'): void {
    this.showExportMenu.set(false);
    if (type === 'svg') this.exportSvg();
    else if (type === 'png') this.exportPng();
    else if (type === 'pdf') this.exportPdf();
    else if (type === 'csv') this.exportCsv();
    else if (type === 'json') this.exportJson();
  }

  selectNode(node: PositionedNode, event: PointerEvent): void {
    event.stopPropagation();
    event.preventDefault();
    this.selectedNode.set(node);
    if (!this.showDetails()) {
      this.showDetails.set(true);
    }
    this.startNodeDrag(node, event);
  }

  selectLinkedNode(link: FamilyTreeLink, currentId: string): void {
    const next = this.nodeById(this.otherNodeId(link, currentId));
    if (next) {
      this.selectedNode.set(next);
      this.focusNode(next.id);
    }
  }

  focusNode(nodeId: string): void {
    const node = this.nodeById(nodeId);
    if (!node) {
      return;
    }
    this.translateX.set(550 - node.x * this.scale());
    this.translateY.set(310 - node.y * this.scale());
  }

  resetView(): void {
    const nodes = this.layoutNodes();
    if (!nodes || nodes.length === 0) {
      this.scale.set(1);
      this.translateX.set(0);
      this.translateY.set(0);
      return;
    }
    
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    
    for (const node of nodes) {
      minX = Math.min(minX, node.x - 100);
      maxX = Math.max(maxX, node.x + 100);
      minY = Math.min(minY, node.y - 60);
      maxY = Math.max(maxY, node.y + 60);
    }
    
    const contentWidth = maxX - minX;
    const contentHeight = maxY - minY;
    
    const viewportWidth = 1100;
    const viewportHeight = 620;
    const padding = 40;
    
    const scaleX = (viewportWidth - padding * 2) / (contentWidth || viewportWidth);
    const scaleY = (viewportHeight - padding * 2) / (contentHeight || viewportHeight);
    
    const scale = Math.min(scaleX, scaleY, 1.2);
    
    const centerX = minX + contentWidth / 2;
    const centerY = minY + contentHeight / 2;
    
    const translateX = viewportWidth / 2 - centerX * scale;
    const translateY = viewportHeight / 2 - centerY * scale;
    
    this.scale.set(scale);
    this.translateX.set(translateX);
    this.translateY.set(translateY);
  }

  resetLayout(): void {
    this.manualPositions.set({});
    this.manualLinkOffsets.set({});
    const selectedId = this.selectedNode()?.id;
    if (selectedId) {
      this.selectedNode.set(this.nodeById(selectedId) || null);
    }
  }

  exportJson(): void {
    const tree = this.tree();
    if (!tree) return;
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(tree, null, 2));
    const dl = document.createElement('a');
    dl.setAttribute('href', dataStr);
    dl.setAttribute('download', `family-tree-${this.selectedPersonId()}.json`);
    document.body.appendChild(dl);
    dl.click();
    document.body.removeChild(dl);
  }

  private prepareSvgForExport(): { clone: SVGSVGElement; width: number; height: number } | null {
    const svg = document.querySelector('.family-graph') as SVGSVGElement;
    const nodes = this.layoutNodes();
    if (!svg || nodes.length === 0) return null;
    
    // Compute bounding box encompassing all nodes with generous margins
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const node of nodes) {
      minX = Math.min(minX, node.x - 140);
      maxX = Math.max(maxX, node.x + 140);
      minY = Math.min(minY, node.y - 80);
      maxY = Math.max(maxY, node.y + 80);
    }
    
    const padding = 60;
    minX = Math.floor(minX - padding);
    minY = Math.floor(minY - padding);
    maxX = Math.ceil(maxX + padding);
    maxY = Math.ceil(maxY + padding);
    
    const width = Math.max(900, maxX - minX);
    const height = Math.max(600, maxY - minY);

    const clone = svg.cloneNode(true) as SVGSVGElement;
    clone.style.overflow = 'visible';
    
    // Reset transform on all top-level group elements in SVG so pan/zoom offset doesn't shift export
    Array.from(clone.children).forEach(child => {
      if (child.tagName.toLowerCase() === 'g') {
        child.setAttribute('transform', 'translate(0, 0) scale(1)');
      }
    });

    // Update viewBox and dimensions to fit entire graph content perfectly
    clone.setAttribute('viewBox', `${minX} ${minY} ${width} ${height}`);
    clone.setAttribute('width', width.toString());
    clone.setAttribute('height', height.toString());

    // Inject solid background rect
    const bgRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    bgRect.setAttribute('x', minX.toString());
    bgRect.setAttribute('y', minY.toString());
    bgRect.setAttribute('width', width.toString());
    bgRect.setAttribute('height', height.toString());
    bgRect.setAttribute('fill', '#fcfbf9');
    clone.insertBefore(bgRect, clone.firstChild);
    
    const styles = Array.from(document.querySelectorAll('style')).map(s => s.textContent).join('\n');
    const computed = getComputedStyle(document.body);
    const vars = [
      '--surface', '--outline-soft', '--primary', '--terracotta', '--growth', 
      '--surface-container', '--sand-bg', '--outline', '--ink', '--primary-soft', 
      '--muted', '--terracotta-soft'
    ];
    const rootVars = vars.map(v => `${v}: ${computed.getPropertyValue(v).trim()};`).join(' ');
    
    const fontOverrideCss = `
      svg { overflow: visible !important; }
      svg, text, tspan {
        font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif !important;
      }
      .node-title { font-weight: 700 !important; font-size: 14px !important; }
      .node-meta, .node-group { font-size: 12px !important; }
      .edge-label { font-weight: 700 !important; font-size: 13px !important; }
    `;
    
    const styleNode = document.createElement('style');
    styleNode.textContent = `svg { ${rootVars} }\n${styles}\n${fontOverrideCss}`;
    clone.insertBefore(styleNode, clone.firstChild);
    
    return { clone, width, height };
  }

  exportSvg(): void {
    const prepared = this.prepareSvgForExport();
    if (!prepared) return;
    const serializer = new XMLSerializer();
    let source = serializer.serializeToString(prepared.clone);
    if (!source.match(/^<svg[^>]+xmlns="http\:\/\/www\.w3\.org\/2000\/svg"/)) {
      source = source.replace(/^<svg/, '<svg xmlns="http://www.w3.org/2000/svg"');
    }
    const dataStr = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(source);
    const dl = document.createElement('a');
    dl.setAttribute('href', dataStr);
    dl.setAttribute('download', `family-tree-${this.selectedPersonId()}.svg`);
    document.body.appendChild(dl);
    dl.click();
    document.body.removeChild(dl);
  }

  exportPng(): void {
    const prepared = this.prepareSvgForExport();
    if (!prepared) return;
    const { clone, width, height } = prepared;
    
    const serializer = new XMLSerializer();
    let source = serializer.serializeToString(clone);
    if (!source.match(/^<svg[^>]+xmlns="http\:\/\/www\.w3\.org\/2000\/svg"/)) {
      source = source.replace(/^<svg/, '<svg xmlns="http://www.w3.org/2000/svg"');
    }
    
    const img = new Image();
    const svgBlob = new Blob([source], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);
    img.onload = () => {
      const scale = 2; // High-DPI export
      const canvas = document.createElement('canvas');
      canvas.width = width * scale;
      canvas.height = height * scale;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.scale(scale, scale);
        ctx.fillStyle = '#fcfbf9';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
        const pngData = canvas.toDataURL('image/png');
        const dl = document.createElement('a');
        dl.setAttribute('href', pngData);
        dl.setAttribute('download', `family-tree-${this.selectedPersonId()}.png`);
        document.body.appendChild(dl);
        dl.click();
        document.body.removeChild(dl);
      }
      URL.revokeObjectURL(url);
    };
    img.src = url;
  }

  exportPdf(): void {
    window.print();
  }

  exportCsv(): void {
    const tree = this.tree();
    if (!tree) return;
    const header = ['Source', 'Relation', 'Category', 'Target', 'Status'].join(',');
    const rows = tree.links.map(link => {
      const source = tree.nodes.find(n => n.id === link.source)?.label || link.source;
      const target = tree.nodes.find(n => n.id === link.target)?.label || link.target;
      return [
        `"${source}"`,
        `"${link.type}"`,
        `"${link.category}"`,
        `"${target}"`,
        `"${link.status}"`
      ].join(',');
    });
    const csvContent = [header, ...rows].join('\n');
    const dataStr = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csvContent);
    const dl = document.createElement('a');
    dl.setAttribute('href', dataStr);
    dl.setAttribute('download', `family-tree-${this.selectedPersonId()}.csv`);
    document.body.appendChild(dl);
    dl.click();
    document.body.removeChild(dl);
  }

  zoomBy(factor: number): void {
    this.scale.set(this.clampScale(this.scale() * factor));
  }

  zoomPercent(): number {
    return Math.round(this.scale() * 100);
  }

  onWheel(event: WheelEvent): void {
    event.preventDefault();
    this.zoomBy(event.deltaY > 0 ? 0.92 : 1.08);
  }

  startPan(event: PointerEvent): void {
    if (this.nodeDragStart || this.linkDragStart || this.targetDragStart) {
      return;
    }
    if (!this.showDetails()) {
      this.showDetails.set(true);
    }
    this.panStart = { x: event.clientX, y: event.clientY, tx: this.translateX(), ty: this.translateY() };
  }

  movePan(event: PointerEvent): void {
    if (this.nodeDragStart) {
      this.moveNode(event);
      return;
    }
    if (this.linkDragStart) {
      this.moveLink(event);
      return;
    }
    if (this.targetDragStart) {
      this.moveTarget(event);
      return;
    }
    if (!this.panStart) {
      return;
    }
    this.translateX.set(this.panStart.tx + event.clientX - this.panStart.x);
    this.translateY.set(this.panStart.ty + event.clientY - this.panStart.y);
  }

  endPan(): void {
    this.panStart = null;
  }

  endInteraction(event: PointerEvent): void {
    this.releasePointer(event);
    this.nodeDragStart = null;
    this.linkDragStart = null;
    this.targetDragStart = null;
    this.draggedNodeId.set(null);
    this.draggedLinkId.set(null);
    this.endPan();
  }

  transform(): string {
    return `translate(${this.translateX()} ${this.translateY()}) scale(${this.scale()})`;
  }

  edgePath(link: FamilyTreeLink, source: PositionedNode, target: PositionedNode): string {
    const control = this.edgeControlPoint(link, source, target);
    const tx = this.manualLinkOffsets()[link.id]?.tx || 0;
    return `M ${source.x} ${source.y + 42} C ${source.x + control.dx} ${control.y}, ${target.x + control.dx} ${control.y}, ${target.x + tx} ${target.y - 42}`;
  }

  edgeLabelTransform(link: FamilyTreeLink, source: PositionedNode, target: PositionedNode): string {
    const control = this.edgeControlPoint(link, source, target);
    const x = control.x;
    const y = control.y - 16 / this.scale();
    const inverseScale = 1 / this.scale();
    return `translate(${x} ${y}) scale(${inverseScale})`;
  }

  linksFor(nodeId: string): FamilyTreeLink[] {
    return this.tree()?.links.filter((link) => link.source === nodeId || link.target === nodeId) || [];
  }

  isSelectedLink(link: FamilyTreeLink): boolean {
    const selected = this.selectedNode();
    return Boolean(selected && (link.source === selected.id || link.target === selected.id));
  }

  otherNodeId(link: FamilyTreeLink, currentId: string): string {
    return link.source === currentId ? link.target : link.source;
  }

  labelFor(personId: string): string {
    return this.nodeById(personId)?.label || personId;
  }

  iconGlyph(node: FamilyTreeNode): string {
    if (node.group === 'child') return 'E';
    if (node.group === 'spouse') return 'C';
    if (node.group === 'parent') return 'P';
    if (node.group === 'sibling') return 'F';
    return '●';
  }

  nodeMeta(node: FamilyTreeNode): string {
    return node.birth_date || (node.estimated_age ? `${node.estimated_age} ${this.i18n.t('familyTree.years')}` : this.i18n.t('familyTree.ageUnknown'));
  }

  shortRelation(type: string): string {
    return this.i18n.t(('familyTree.rel.' + type) as any) || type;
  }

  labelCategory(category: FamilyTreeLink['category']): string {
    return {
      parent_child: this.i18n.t('familyTree.relation.parentChild'),
      spouse: this.i18n.t('familyTree.relation.spouse'),
      guardian: this.i18n.t('familyTree.relation.guardian'),
      other: this.i18n.t('familyTree.relation.other'),
    }[category];
  }

  labelGroup(group: FamilyTreeNode['group']): string {
    return {
      root: this.i18n.t('familyTree.group.root'),
      parent: this.i18n.t('familyTree.group.parent'),
      spouse: this.i18n.t('familyTree.group.spouse'),
      child: this.i18n.t('familyTree.group.child'),
      sibling: this.i18n.t('familyTree.group.sibling'),
      relative: this.i18n.t('familyTree.group.relative'),
    }[group];
  }

  private centerRow(nodes: FamilyTreeNode[], y: number): PositionedNode[] {
    const gap = 210;
    const startX = 550 - ((nodes.length - 1) * gap) / 2;
    return nodes.map((node, index) => ({ ...node, x: startX + index * gap, y }));
  }

  private uniqueNodes(nodes: PositionedNode[]): PositionedNode[] {
    const seen = new Set<string>();
    return nodes.filter((node) => {
      if (seen.has(node.id)) {
        return false;
      }
      seen.add(node.id);
      return true;
    });
  }

  private clampScale(value: number): number {
    return Math.min(2.2, Math.max(0.45, value));
  }

  private startNodeDrag(node: PositionedNode, event: PointerEvent): void {
    const point = this.graphPointFromEvent(event);
    if (!point) {
      return;
    }
    this.capturePointer(event);
    this.panStart = null;
    this.nodeDragStart = {
      id: node.id,
      offsetX: point.x - node.x,
      offsetY: point.y - node.y,
    };
    this.draggedNodeId.set(node.id);
  }

  private moveNode(event: PointerEvent): void {
    if (!this.nodeDragStart) {
      return;
    }
    event.preventDefault();
    const point = this.graphPointFromEvent(event);
    if (!point) {
      return;
    }
    const next = {
      x: point.x - this.nodeDragStart.offsetX,
      y: point.y - this.nodeDragStart.offsetY,
    };
    this.manualPositions.update((positions) => ({
      ...positions,
      [this.nodeDragStart!.id]: next,
    }));
    const selected = this.selectedNode();
    if (selected?.id === this.nodeDragStart.id) {
      this.selectedNode.set({ ...selected, ...next });
    }
  }

  startLinkDrag(link: FamilyTreeLink, event: PointerEvent): void {
    event.stopPropagation();
    event.preventDefault();
    const source = this.nodeById(link.source);
    const target = this.nodeById(link.target);
    const point = this.graphPointFromEvent(event);
    if (!source || !target || !point) {
      return;
    }
    const control = this.edgeControlPoint(link, source, target);
    this.capturePointer(event);
    this.panStart = null;
    if (!this.showDetails()) {
      this.showDetails.set(true);
    }
    this.linkDragStart = {
      id: link.id,
      offsetX: point.x - control.x,
      offsetY: point.y - control.y,
    };
    this.draggedLinkId.set(link.id);
  }

  private moveLink(event: PointerEvent): void {
    if (!this.linkDragStart) {
      return;
    }
    event.preventDefault();
    const link = this.visibleLinks().find((item) => item.id === this.linkDragStart?.id);
    const point = this.graphPointFromEvent(event);
    if (!link || !point) {
      return;
    }
    const source = this.nodeById(link.source);
    const target = this.nodeById(link.target);
    if (!source || !target) {
      return;
    }
    const base = this.edgeBasePoint(source, target);
    const nextControl = {
      x: point.x - this.linkDragStart.offsetX,
      y: point.y - this.linkDragStart.offsetY,
    };
      this.manualLinkOffsets.update((offsets) => ({
        ...offsets,
        [link.id]: {
          dx: nextControl.x - base.x,
          dy: nextControl.y - base.y,
          tx: offsets[link.id]?.tx || 0
        },
      }));
    }

    startTargetDrag(link: FamilyTreeLink, event: PointerEvent): void {
      event.stopPropagation();
      event.preventDefault();
      const point = this.graphPointFromEvent(event);
      const target = this.nodeById(link.target);
      if (!target || !point) {
        return;
      }
      this.capturePointer(event);
      this.panStart = null;
      if (!this.showDetails()) {
        this.showDetails.set(true);
      }
      const currentTx = this.manualLinkOffsets()[link.id]?.tx || 0;
      this.targetDragStart = {
        id: link.id,
        offsetX: point.x - (target.x + currentTx),
      };
      this.draggedLinkId.set(link.id);
    }

    private moveTarget(event: PointerEvent): void {
      if (!this.targetDragStart) {
        return;
      }
      event.preventDefault();
      const link = this.visibleLinks().find((item) => item.id === this.targetDragStart?.id);
      const point = this.graphPointFromEvent(event);
      if (!link || !point) {
        return;
      }
      const target = this.nodeById(link.target);
      if (!target) {
        return;
      }
      
      let newTx = point.x - this.targetDragStart.offsetX - target.x;
      // Constraint to avoid going past the edges of the box
      newTx = Math.max(-76, Math.min(76, newTx));

      this.manualLinkOffsets.update((offsets) => ({
        ...offsets,
        [link.id]: {
          dx: offsets[link.id]?.dx || 0,
          dy: offsets[link.id]?.dy || 0,
          tx: newTx
        },
      }));
    }

  private graphPointFromEvent(event: PointerEvent): { x: number; y: number } | null {
    const svg = this.svgFromEvent(event);
    if (!svg) {
      return null;
    }
    const point = svg.createSVGPoint();
    point.x = event.clientX;
    point.y = event.clientY;
    const matrix = svg.getScreenCTM();
    if (!matrix) {
      return null;
    }
    const svgPoint = point.matrixTransform(matrix.inverse());
    return {
      x: (svgPoint.x - this.translateX()) / this.scale(),
      y: (svgPoint.y - this.translateY()) / this.scale(),
    };
  }

  private svgFromEvent(event: PointerEvent): SVGSVGElement | null {
    const target = event.currentTarget as SVGElement | null;
    if (!target) {
      return null;
    }
    if (target instanceof SVGSVGElement) {
      return target;
    }
    return target.ownerSVGElement;
  }

  private capturePointer(event: PointerEvent): void {
    const target = event.currentTarget as Element | null;
    if (target?.setPointerCapture) {
      target.setPointerCapture(event.pointerId);
    }
  }

  private releasePointer(event: PointerEvent): void {
    const target = event.target as Element | null;
    if (target?.hasPointerCapture?.(event.pointerId)) {
      target.releasePointerCapture(event.pointerId);
    }
  }

  private edgeBasePoint(source: PositionedNode, target: PositionedNode): { x: number; y: number } {
    return {
      x: (source.x + target.x) / 2,
      y: (source.y + target.y) / 2,
    };
  }

  private edgeControlPoint(
    link: FamilyTreeLink,
    source: PositionedNode,
    target: PositionedNode,
  ): { x: number; y: number; dx: number; dy: number } {
    const base = this.edgeBasePoint(source, target);
    const offset = this.manualLinkOffsets()[link.id] || { dx: 0, dy: 0 };
    return {
      x: base.x + offset.dx,
      y: base.y + offset.dy,
      dx: offset.dx,
      dy: offset.dy,
    };
  }
}
