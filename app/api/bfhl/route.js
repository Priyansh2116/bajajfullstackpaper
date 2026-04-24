import { NextResponse } from 'next/server';

// My specific submitter identity
const SUBMITTER_IDENTITY = {
  user_id: 'priyanshsonthalia_13032005',
  email_id: 'ps9746@srmist.edu.in',
  college_roll_number: 'RA2311003010244',
};

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { data } = body;

    if (!Array.isArray(data)) {
      return NextResponse.json(
        { error: 'Expected { data: string[] }' },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    const result = analyzeNodeList(data);
    return NextResponse.json(result, { headers: CORS_HEADERS });
  } catch {
    return NextResponse.json(
      { error: 'Malformed request body' },
      { status: 400, headers: CORS_HEADERS }
    );
  }
}


//main pipeline
function analyzeNodeList(rawEntries) {
  const { validEdges, invalidEntries } = classifyEntries(rawEntries);
  const { uniqueEdges, duplicateEdges } = deduplicateEdges(validEdges);
  const graph = buildDirectedGraph(uniqueEdges);
  const hierarchies = extractHierarchies(graph);
  const summary = computeSummary(hierarchies);

  return {
    ...SUBMITTER_IDENTITY,
    hierarchies,
    invalid_entries: invalidEntries,
    duplicate_edges: duplicateEdges,
    summary,
  };
}


//remove self loops and make sure the given input is vali
//this part of the code also looks for self loops

const EDGE_FORMAT = /^[A-Z]->[A-Z]$/;

function classifyEntries(rawEntries) {
  const validEdges = [];
  const invalidEntries = [];

  for (const raw of rawEntries) {
    if (typeof raw !== 'string') {

      invalidEntries.push(String(raw));
      continue;
    }

    const entry = raw.trim();
    const matchesPattern = EDGE_FORMAT.test(entry);

    // In "A->B", index 0 is parent and index 3 is child
    const isSelfLoop = entry[0] === entry[3];

    if (!matchesPattern || isSelfLoop) {
      invalidEntries.push(entry);
    } else {
      validEdges.push(entry);
    }
  }

  return { validEdges, invalidEntries };
}


//check for duplocate edges
function deduplicateEdges(edges) {
  const alreadySeen = new Set();
  const alreadyFlaggedAsDuplicate = new Set();
  const uniqueEdges = [];
  const duplicateEdges = [];

  for (const edge of edges) {
    if (!alreadySeen.has(edge)) {
      alreadySeen.add(edge);
      uniqueEdges.push(edge);
    } else if (!alreadyFlaggedAsDuplicate.has(edge)) {
      alreadyFlaggedAsDuplicate.add(edge);
      duplicateEdges.push(edge);
    }
    // Third+ occurrence: absorbed quietly
  }

  return { uniqueEdges, duplicateEdges };
}



function buildDirectedGraph(edges) {
  // parent -> list of its accepted children
  const adjacencyList = new Map();

  // child -> the one parent that "won" the multi-parent race
  const childToParentMap = new Map();

  // Used later to sort hierarchies by when they first appear in the input
  const nodeFirstSeenIndex = new Map();
  let seenCounter = 0;

  function markNodeAsSeen(node) {
    if (!nodeFirstSeenIndex.has(node)) {
      nodeFirstSeenIndex.set(node, seenCounter++);
    }
  }

  for (const edge of edges) {
    const [parentNode, childNode] = edge.split('->');

    // Multi-parent rule: skip this edge if the child already has a parent
    const childAlreadyHasParent = childToParentMap.has(childNode);
    if (childAlreadyHasParent) continue;

    childToParentMap.set(childNode, parentNode);

    if (!adjacencyList.has(parentNode)) {
      adjacencyList.set(parentNode, []);
    }
    adjacencyList.get(parentNode).push(childNode);

    markNodeAsSeen(parentNode);
    markNodeAsSeen(childNode);
  }

  const allNodes = new Set(nodeFirstSeenIndex.keys());

  return { adjacencyList, childToParentMap, nodeFirstSeenIndex, allNodes };
}


//group into components
function extractHierarchies(graph) {
  const { adjacencyList, childToParentMap, nodeFirstSeenIndex, allNodes } = graph;

  const componentGroups = groupIntoComponents(allNodes, childToParentMap);

  componentGroups.sort((groupA, groupB) => {
    const earliestInA = Math.min(...groupA.map(n => nodeFirstSeenIndex.get(n)));
    const earliestInB = Math.min(...groupB.map(n => nodeFirstSeenIndex.get(n)));
    return earliestInA - earliestInB;
  });

  return componentGroups.map(nodes =>
    describeComponent(nodes, adjacencyList, childToParentMap)
  );
}


//component grouping with union find
function groupIntoComponents(allNodes, childToParentMap) {
  const representativeOf = {};
  for (const node of allNodes) representativeOf[node] = node;

  function findRepresentative(node) {
    // Path compression: point directly to the root on the way back up
    if (representativeOf[node] !== node) {
      representativeOf[node] = findRepresentative(representativeOf[node]);
    }
    return representativeOf[node];
  }

  function mergeGroups(nodeA, nodeB) {
    representativeOf[findRepresentative(nodeA)] = findRepresentative(nodeB);
  }

  // Every parent-child relationship means they're in the same component
  for (const [child, parent] of childToParentMap) {
    mergeGroups(child, parent);
  }

  const buckets = new Map();
  for (const node of allNodes) {
    const rep = findRepresentative(node);
    if (!buckets.has(rep)) buckets.set(rep, []);
    buckets.get(rep).push(node);
  }

  return [...buckets.values()];
}


//describing a singe component
function describeComponent(nodes, adjacencyList, childToParentMap) {
  const nodesWithNoParent = nodes.filter(node => !childToParentMap.has(node));

  if (nodesWithNoParent.length === 0) {
    const alphabeticallyFirstNode = [...nodes].sort()[0];
    return { root: alphabeticallyFirstNode, tree: {}, has_cycle: true };
  }

  const rootNode = nodesWithNoParent[0];

  const cycleDetected = detectCycleFromRoot(rootNode, adjacencyList);

  if (cycleDetected) {
    return { root: rootNode, tree: {}, has_cycle: true };
  }

  const nestedTreeStructure = { [rootNode]: buildNestedTree(rootNode, adjacencyList) };
  const treeDepth = longestRootToLeafLength(rootNode, adjacencyList);

  return { root: rootNode, tree: nestedTreeStructure, depth: treeDepth };
}


//building nexted treee object
function buildNestedTree(node, adjacencyList) {
  const children = adjacencyList.get(node) ?? [];
  const subtree = {};

  for (const child of children) {
    subtree[child] = buildNestedTree(child, adjacencyList);
  }

  return subtree;
}


//calculate depth
function longestRootToLeafLength(node, adjacencyList) {
  const children = adjacencyList.get(node) ?? [];

  if (children.length === 0) return 1;

  const longestChildSubpath = Math.max(
    ...children.map(child => longestRootToLeafLength(child, adjacencyList))
  );

  return 1 + longestChildSubpath;
}


//cycle detection 
function detectCycleFromRoot(startNode, adjacencyList) {
  const fullyExplored = new Set();
  const nodesOnCurrentPath = new Set();

  function dfs(node) {
    fullyExplored.add(node);
    nodesOnCurrentPath.add(node);

    for (const neighbor of (adjacencyList.get(node) ?? [])) {
      if (!fullyExplored.has(neighbor)) {
        const cycleFoundBelow = dfs(neighbor);
        if (cycleFoundBelow) return true;
      } else if (nodesOnCurrentPath.has(neighbor)) {
        return true;
      }
    }

    nodesOnCurrentPath.delete(node); // backtrack cleanly
    return false;
  }

  return dfs(startNode);
}



function computeSummary(hierarchies) {
  const validTrees = hierarchies.filter(h => !h.has_cycle);
  const cyclicGroups = hierarchies.filter(h => h.has_cycle);

  const deepestTree = validTrees.reduce((currentBest, candidate) => {
    if (!currentBest) return candidate;

    const candidateIsDeeper = candidate.depth > currentBest.depth;
    const depthIsTied = candidate.depth === currentBest.depth;
    const candidateRootComesFirst = candidate.root < currentBest.root;

    if (candidateIsDeeper || (depthIsTied && candidateRootComesFirst)) {
      return candidate;
    }
    return currentBest;
  }, null);

  return {
    total_trees: validTrees.length,
    total_cycles: cyclicGroups.length,
    largest_tree_root: deepestTree?.root ?? null,
  };
}
