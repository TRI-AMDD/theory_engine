// Structure file parser for CIF, XYZ, VASP/POSCAR formats
import JSZip from 'jszip';

export interface ParsedStructure {
  name?: string;
  atoms: number;
  formula: string;
  elements: Record<string, number>;
  lattice?: {
    a: number;
    b: number;
    c: number;
    alpha: number;
    beta: number;
    gamma: number;
  };
}

export interface MultiStructureInfo {
  totalCount: number;
  samples: ParsedStructure[];
}

// Parse element counts into a chemical formula
function formatFormula(elements: Record<string, number>): string {
  // Sort elements by electronegativity convention (roughly)
  const order = ['Li', 'Na', 'K', 'Rb', 'Cs', 'Be', 'Mg', 'Ca', 'Sr', 'Ba',
    'Sc', 'Ti', 'V', 'Cr', 'Mn', 'Fe', 'Co', 'Ni', 'Cu', 'Zn',
    'Y', 'Zr', 'Nb', 'Mo', 'Ru', 'Rh', 'Pd', 'Ag', 'Cd',
    'La', 'Ce', 'Pr', 'Nd', 'Sm', 'Eu', 'Gd', 'Tb', 'Dy', 'Ho', 'Er', 'Tm', 'Yb', 'Lu',
    'Hf', 'Ta', 'W', 'Re', 'Os', 'Ir', 'Pt', 'Au', 'Hg',
    'Al', 'Ga', 'In', 'Tl', 'Si', 'Ge', 'Sn', 'Pb',
    'B', 'C', 'N', 'P', 'As', 'Sb', 'Bi',
    'O', 'S', 'Se', 'Te', 'F', 'Cl', 'Br', 'I', 'H'];

  const sortedElements = Object.keys(elements).sort((a, b) => {
    const indexA = order.indexOf(a);
    const indexB = order.indexOf(b);
    if (indexA === -1 && indexB === -1) return a.localeCompare(b);
    if (indexA === -1) return 1;
    if (indexB === -1) return -1;
    return indexA - indexB;
  });

  return sortedElements
    .map(el => elements[el] === 1 ? el : `${el}${elements[el]}`)
    .join('');
}

// Parse XYZ format
function parseXYZ(content: string): ParsedStructure {
  const lines = content.trim().split('\n');
  const atoms = parseInt(lines[0].trim(), 10);
  const elements: Record<string, number> = {};

  for (let i = 2; i < lines.length && i < atoms + 2; i++) {
    const parts = lines[i].trim().split(/\s+/);
    if (parts.length >= 4) {
      const element = parts[0].charAt(0).toUpperCase() + parts[0].slice(1).toLowerCase();
      elements[element] = (elements[element] || 0) + 1;
    }
  }

  return {
    atoms,
    formula: formatFormula(elements),
    elements,
  };
}

// Parse CIF format
function parseCIF(content: string): ParsedStructure {
  const lines = content.split('\n');
  const elements: Record<string, number> = {};
  let inAtomSite = false;
  let typeSymbolCol = -1;
  let labelCol = -1;
  let columnCount = 0;

  // Lattice parameters
  let a = 0, b = 0, c = 0, alpha = 90, beta = 90, gamma = 90;

  for (const line of lines) {
    const trimmed = line.trim();

    // Parse lattice parameters
    if (trimmed.startsWith('_cell_length_a')) {
      a = parseFloat(trimmed.split(/\s+/)[1]) || 0;
    } else if (trimmed.startsWith('_cell_length_b')) {
      b = parseFloat(trimmed.split(/\s+/)[1]) || 0;
    } else if (trimmed.startsWith('_cell_length_c')) {
      c = parseFloat(trimmed.split(/\s+/)[1]) || 0;
    } else if (trimmed.startsWith('_cell_angle_alpha')) {
      alpha = parseFloat(trimmed.split(/\s+/)[1]) || 90;
    } else if (trimmed.startsWith('_cell_angle_beta')) {
      beta = parseFloat(trimmed.split(/\s+/)[1]) || 90;
    } else if (trimmed.startsWith('_cell_angle_gamma')) {
      gamma = parseFloat(trimmed.split(/\s+/)[1]) || 90;
    }

    // Detect atom_site loop
    if (trimmed === 'loop_') {
      inAtomSite = false;
      typeSymbolCol = -1;
      labelCol = -1;
      columnCount = 0;
    }

    if (trimmed.startsWith('_atom_site_')) {
      inAtomSite = true;
      if (trimmed.includes('type_symbol')) {
        typeSymbolCol = columnCount;
      } else if (trimmed.includes('label')) {
        labelCol = columnCount;
      }
      columnCount++;
    } else if (inAtomSite && !trimmed.startsWith('_') && trimmed.length > 0 && !trimmed.startsWith('loop_') && !trimmed.startsWith('#')) {
      const parts = trimmed.split(/\s+/);
      let element = '';

      if (typeSymbolCol >= 0 && parts[typeSymbolCol]) {
        element = parts[typeSymbolCol].replace(/[^A-Za-z]/g, '');
      } else if (labelCol >= 0 && parts[labelCol]) {
        element = parts[labelCol].replace(/[^A-Za-z]/g, '');
      } else if (parts[0]) {
        element = parts[0].replace(/[^A-Za-z]/g, '');
      }

      if (element) {
        element = element.charAt(0).toUpperCase() + element.slice(1).toLowerCase();
        // Handle common two-letter elements
        if (element.length > 2) {
          element = element.substring(0, 2);
        }
        elements[element] = (elements[element] || 0) + 1;
      }
    }
  }

  const atoms = Object.values(elements).reduce((a, b) => a + b, 0);

  return {
    atoms,
    formula: formatFormula(elements),
    elements,
    lattice: a > 0 ? { a, b, c, alpha, beta, gamma } : undefined,
  };
}

// Parse VASP POSCAR format
function parsePOSCAR(content: string): ParsedStructure {
  const lines = content.trim().split('\n');
  const elements: Record<string, number> = {};

  // Line 6 has element symbols (VASP 5+) or line 1 comment may have them
  // Line 7 (or 6 for VASP 4) has counts
  const ELEMENT_LINE = 5;
  const COUNT_LINE = 6;

  // Check if line 6 starts with numbers (VASP 4 format)
  if (lines[5] && /^\s*\d/.test(lines[5])) {
    // VASP 4 format - try to get elements from comment line
    const comment = lines[0].trim();
    const possibleElements = comment.split(/\s+/).filter(s => /^[A-Z][a-z]?$/.test(s));
    if (possibleElements.length > 0) {
      const counts = lines[5].trim().split(/\s+/).map(n => parseInt(n, 10));
      possibleElements.forEach((el, i) => {
        if (counts[i]) {
          elements[el] = counts[i];
        }
      });
    }
  } else {
    // VASP 5+ format
    const elementSymbols = lines[ELEMENT_LINE].trim().split(/\s+/);
    const counts = lines[COUNT_LINE].trim().split(/\s+/).map(n => parseInt(n, 10));

    elementSymbols.forEach((el, i) => {
      if (counts[i] && /^[A-Z][a-z]?$/.test(el)) {
        elements[el] = counts[i];
      }
    });
  }

  // Parse lattice vectors
  const scale = parseFloat(lines[1]) || 1;
  let a = 0, b = 0, c = 0;

  if (lines[2] && lines[3] && lines[4]) {
    const v1 = lines[2].trim().split(/\s+/).map(parseFloat);
    const v2 = lines[3].trim().split(/\s+/).map(parseFloat);
    const v3 = lines[4].trim().split(/\s+/).map(parseFloat);

    a = Math.sqrt(v1[0] ** 2 + v1[1] ** 2 + v1[2] ** 2) * scale;
    b = Math.sqrt(v2[0] ** 2 + v2[1] ** 2 + v2[2] ** 2) * scale;
    c = Math.sqrt(v3[0] ** 2 + v3[1] ** 2 + v3[2] ** 2) * scale;
  }

  const atoms = Object.values(elements).reduce((a, b) => a + b, 0);

  return {
    atoms,
    formula: formatFormula(elements),
    elements,
    lattice: a > 0 ? { a, b, c, alpha: 90, beta: 90, gamma: 90 } : undefined,
  };
}

// Main parser function
export function parseStructureFile(content: string, fileName: string): ParsedStructure {
  const ext = fileName.split('.').pop()?.toLowerCase();

  try {
    switch (ext) {
      case 'xyz':
        return parseXYZ(content);
      case 'cif':
        return parseCIF(content);
      case 'vasp':
      case 'poscar':
        return parsePOSCAR(content);
      default: {
        // Try to auto-detect format
        if (content.includes('_atom_site') || content.includes('data_')) {
          return parseCIF(content);
        }
        const firstLine = content.trim().split('\n')[0];
        if (/^\d+\s*$/.test(firstLine.trim())) {
          return parseXYZ(content);
        }
        return parsePOSCAR(content);
      }
    }
  } catch {
    return {
      atoms: 0,
      formula: 'Unknown',
      elements: {},
    };
  }
}

// Check if a file is a structure file
function isStructureFile(fileName: string): boolean {
  const ext = fileName.split('.').pop()?.toLowerCase();
  return ['cif', 'xyz', 'vasp', 'poscar'].includes(ext || '');
}

// Parse ZIP file to get list of structures with details
export async function parseZipFile(file: File): Promise<MultiStructureInfo> {
  const zip = await JSZip.loadAsync(file);
  const structureFiles: string[] = [];

  // Collect all structure files in ZIP
  zip.forEach((relativePath, zipEntry) => {
    if (!zipEntry.dir && isStructureFile(relativePath)) {
      structureFiles.push(relativePath);
    }
  });

  // Parse first 3 structures for preview
  const samples: ParsedStructure[] = [];
  const filesToParse = structureFiles.slice(0, 3);

  for (const filePath of filesToParse) {
    try {
      const content = await zip.file(filePath)?.async('string');
      if (content) {
        const parsed = parseStructureFile(content, filePath);
        parsed.name = filePath.split('/').pop() || filePath;
        samples.push(parsed);
      }
    } catch (e) {
      console.error(`Error parsing ${filePath}:`, e);
    }
  }

  return {
    totalCount: structureFiles.length,
    samples,
  };
}

// Parse structure list file with details
export async function parseStructureListWithDetails(content: string, readFile?: (path: string) => Promise<string>): Promise<MultiStructureInfo> {
  const paths = content
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0 && !line.startsWith('#'));

  const samples: ParsedStructure[] = [];

  // If we have a file reader function, parse first 3 files
  if (readFile) {
    const filesToParse = paths.slice(0, 3);
    for (const filePath of filesToParse) {
      try {
        const fileContent = await readFile(filePath);
        const parsed = parseStructureFile(fileContent, filePath);
        parsed.name = filePath.split('/').pop() || filePath;
        samples.push(parsed);
      } catch {
        // Can't read file, just show path
        samples.push({
          name: filePath.split('/').pop() || filePath,
          atoms: 0,
          formula: '(ファイル読み込み待ち)',
          elements: {},
        });
      }
    }
  } else {
    // No file reader, just show paths
    paths.slice(0, 3).forEach(filePath => {
      samples.push({
        name: filePath.split('/').pop() || filePath,
        atoms: 0,
        formula: '(実行時に解析)',
        elements: {},
      });
    });
  }

  return {
    totalCount: paths.length,
    samples,
  };
}

// Parse structure list file (simple version - just paths)
export function parseStructureList(content: string): string[] {
  return content
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0 && !line.startsWith('#'));
}
