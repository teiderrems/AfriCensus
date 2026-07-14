import { SelectComponent } from '@/app/shared/select/select.component';
import { LucideAngularModule } from 'lucide-angular';
import { Component, OnInit, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { ApiService } from '@/app/core/api.service';
import { I18nService } from '@/app/core/i18n/i18n.service';
import { CensusRecord, FamilyTree, FamilyTreeLink, FamilyTreeNode } from '@/app/core/models';
import { PageSizeSelectComponent } from '@/app/shared/page-size-select/page-size-select.component';
import { TablePaginationComponent } from '@/app/shared/table-pagination/table-pagination.component';

type PositionedNode = FamilyTreeNode & { x: number; y: number };
type NodePositions = Record<string, { x: number; y: number }>;
type LinkOffsets = Record<string, { dx: number; dy: number }>;

@Component({
  selector: 'acl-family-tree-page',
  imports: [LucideAngularModule, FormsModule, PageSizeSelectComponent, TablePaginationComponent, SelectComponent],
  templateUrl: './family-tree.component.html',
  styleUrl: './family-tree.component.css',
})
export class FamilyTreeComponent implements OnInit {
  personOptions = computed(() => this.persons().map(p => ({label: p.first_name + ' ' + p.last_name + ' (' + p.household_code + ')', value: p.id})));
  relationCategoryOptions = computed(() => [
    {label: this.i18n.t('family.category.all'), value: ''},
    {label: this.i18n.t('family.category.immediate'), value: 'immediate'},
    {label: this.i18n.t('family.category.extended'), value: 'extended'},
    {label: this.i18n.t('family.category.in_law'), value: 'in_law'}
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
  readonly depthOptions = [0, 1, 2, 3, 4, 5, 6].map(v => ({label: v.toString(), value: v}));
  readonly pageSizes = [5, 10, 20, 50];
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

  constructor(private readonly api: ApiService, readonly i18n: I18nService) {}

  ngOnInit(): void {
    this.api.persons().subscribe({
      next: (persons) => {
        this.persons.set(persons);
        if (persons.length) {
          this.selectPerson(persons[0].id);
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

  selectNode(node: PositionedNode, event: PointerEvent): void {
    event.stopPropagation();
    event.preventDefault();
    this.selectedNode.set(node);
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
    this.scale.set(1);
    this.translateX.set(0);
    this.translateY.set(0);
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

  exportSvg(): void {
    const svg = document.querySelector('.family-graph');
    if (!svg) return;
    const serializer = new XMLSerializer();
    let source = serializer.serializeToString(svg);
    // add name spaces if not present
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
    if (this.nodeDragStart || this.linkDragStart) {
      return;
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
    this.draggedNodeId.set(null);
    this.draggedLinkId.set(null);
    this.endPan();
  }

  transform(): string {
    return `translate(${this.translateX()} ${this.translateY()}) scale(${this.scale()})`;
  }

  edgePath(link: FamilyTreeLink, source: PositionedNode, target: PositionedNode): string {
    const control = this.edgeControlPoint(link, source, target);
    return `M ${source.x} ${source.y + 42} C ${source.x + control.dx} ${control.y}, ${target.x + control.dx} ${control.y}, ${target.x} ${target.y - 42}`;
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
