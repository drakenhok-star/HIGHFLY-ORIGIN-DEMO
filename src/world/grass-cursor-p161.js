/**
 * P16.1 experimental disk scan iterator for budgeted grass rebuilds.
 * Pure arithmetic so CI can prove identical iteration order to P16 loops.
 * Reuses its coordinates instead of allocating one object per cell.
 */
export class GridDiskCursorP161 {
  constructor(x, z, spacing, radius) {
    if (!(spacing > 0 && radius > 0)) throw new RangeError('positive spacing and radius required');
    this.x = x;
    this.z = z;
    this.spacing = spacing;
    this.radiusSquared = radius * radius;
    this.cellRadius = Math.floor(radius / spacing);
    this.centerX = Math.round(x / spacing);
    this.centerZ = Math.round(z / spacing);
    this.startX = this.centerX - this.cellRadius;
    this.endX = this.centerX + this.cellRadius;
    this.endZ = this.centerZ + this.cellRadius;
    this.nextX = this.startX;
    this.nextZ = this.centerZ - this.cellRadius;
    this.ix = 0;
    this.iz = 0;
    this.done = false;
    this.scanned = 0;
    this.accepted = 0;
  }

  next() {
    if (this.done) return false;
    while (this.nextZ <= this.endZ) {
      const ix = this.nextX;
      const iz = this.nextZ;
      this.nextX++;
      if (this.nextX > this.endX) {
        this.nextX = this.startX;
        this.nextZ++;
      }
      this.scanned++;
      const dx = ix * this.spacing - this.x;
      const dz = iz * this.spacing - this.z;
      if (dx * dx + dz * dz > this.radiusSquared) continue;
      this.ix = ix;
      this.iz = iz;
      this.accepted++;
      return true;
    }
    this.done = true;
    return false;
  }
}
