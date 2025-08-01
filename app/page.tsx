"use client";

import { useState, useEffect } from "react";
import { initializeApp, type FirebaseApp } from "firebase/app";
import {
  getFirestore,
  type Firestore,
  collection,
  getDocs,
  doc,
  updateDoc,
  addDoc,
  deleteDoc,
  getDoc,
} from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Database,
  Plus,
  Settings,
  Trash2,
  Edit,
  Save,
  CheckCircle,
  AlertCircle,
  Eye,
  MoreHorizontal,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}

interface FirestoreDocument {
  __id: string;
  [key: string]: any;
}

export default function Component() {
  const [firebaseApp, setFirebaseApp] = useState<FirebaseApp | null>(null);
  const [firestore, setFirestore] = useState<Firestore | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [config, setConfig] = useState<FirebaseConfig>({
    apiKey: "",
    authDomain: "",
    projectId: "",
    storageBucket: "",
    messagingSenderId: "",
    appId: "",
  });
  const [documents, setDocuments] = useState<FirestoreDocument[]>([]);
  const [collections, setCollections] = useState<string[]>([]);
  const [selectedCollection, setSelectedCollection] = useState("");
  const [jsonInput, setJsonInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [editingDoc, setEditingDoc] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Record<string, any>>({});
  const [showConnectionDialog, setShowConnectionDialog] = useState(false);
  const [viewingDoc, setViewingDoc] = useState<FirestoreDocument | null>(null);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);

  useEffect(() => {
    const savedConfig = localStorage.getItem("firebaseConfig");
    if (savedConfig) {
      try {
        const parsedConfig = JSON.parse(savedConfig);
        setConfig(parsedConfig);
        connectToFirebase(parsedConfig);
      } catch (error) {
        console.error("Error parsing saved config:", error);
      }
    }
  }, []);

  const connectToFirebase = async (firebaseConfig: FirebaseConfig) => {
    try {
      setLoading(true);
      const app = initializeApp(firebaseConfig);
      const db = getFirestore(app);

      setFirebaseApp(app);
      setFirestore(db);
      setIsConnected(true);

      localStorage.setItem("firebaseConfig", JSON.stringify(firebaseConfig));

      toast.success("Successfully connected to Firebase!");
      setShowConnectionDialog(false);

      await discoverCollections(db);
    } catch (error) {
      console.error("Firebase connection error:", error);
      toast.error(
        "Failed to connect to Firebase. Please check your credentials."
      );
    } finally {
      setLoading(false);
    }
  };

  const discoverCollections = async (db: Firestore) => {
    try {
      const commonCollections = [
        "users",
        "products",
        "orders",
        "items",
        "posts",
        "comments",
        "categories",
        "settings",
      ];
      const existingCollections: string[] = [];

      for (const collectionName of commonCollections) {
        try {
          const snapshot = await getDocs(collection(db, collectionName));
          if (!snapshot.empty) {
            existingCollections.push(collectionName);
          }
        } catch (error) {
          continue;
        }
      }

      setCollections(existingCollections);

      if (existingCollections.length > 0) {
        toast.success(
          `Found ${
            existingCollections.length
          } collections: ${existingCollections.join(", ")}`
        );
      } else {
        toast.success(
          "Connected! No common collections found. You can enter a collection name manually."
        );
      }
    } catch (error) {
      console.error("Error discovering collections:", error);
      toast.error(
        "Connected but couldn't discover collections. You can enter collection names manually."
      );
    }
  };

  const loadCollection = async (collectionName: string) => {
    if (!firestore) return;

    try {
      setLoading(true);
      const collectionRef = collection(firestore, collectionName);
      const snapshot = await getDocs(collectionRef);

      const docs = snapshot.docs.map((docSnap) => ({
        __id: docSnap.id,
        ...docSnap.data(),
      }));

      setDocuments(docs);
    } catch (error) {
      console.error("Error loading collection:", error);
      toast.error("Failed to load collection");
    } finally {
      setLoading(false);
    }
  };

  const insertDocument = async () => {
    if (!firestore || !selectedCollection || !jsonInput.trim()) return;

    try {
      setLoading(true);
      const data = JSON.parse(jsonInput);
      await addDoc(collection(firestore, selectedCollection), data);

      setJsonInput("");
      toast.success("Document inserted successfully!");

      loadCollection(selectedCollection);
    } catch (error) {
      console.error("Error inserting document:", error);
      toast.error(`Insert failed: ${(error as Error).message}`);
    } finally {
      setLoading(false);
    }
  };

  const updateDocument = async (docId: string) => {
    if (!firestore || !selectedCollection) return;

    try {
      setLoading(true);
      const docRef = doc(firestore, selectedCollection, docId);

      const docSnap = await getDoc(docRef);
      if (!docSnap.exists()) {
        toast.error("Document not found. Cannot update.");
        return;
      }

      await updateDoc(docRef, editValues);

      setEditingDoc(null);
      setEditValues({});
      setShowEditDialog(false);
      toast.success("Document updated successfully!");

      loadCollection(selectedCollection);
    } catch (error) {
      console.error("Error updating document:", error);
      toast.error("Failed to update document");
    } finally {
      setLoading(false);
    }
  };

  const deleteDocument = async (docId: string) => {
    if (!firestore || !selectedCollection) return;

    try {
      setLoading(true);
      await deleteDoc(doc(firestore, selectedCollection, docId));

      toast.success("Document deleted successfully!");

      loadCollection(selectedCollection);
    } catch (error) {
      console.error("Error deleting document:", error);
      toast.error("Failed to delete document");
    } finally {
      setLoading(false);
    }
  };

  const startEditing = (document: FirestoreDocument) => {
    setEditingDoc(document.__id);
    const { id, ...editableData } = document;
    setEditValues(editableData);
    setShowEditDialog(true);
  };

  const cancelEditing = () => {
    setEditingDoc(null);
    setEditValues({});
    setShowEditDialog(false);
  };

  const viewDocument = (document: FirestoreDocument) => {
    setViewingDoc(document);
    setShowViewDialog(true);
  };

  const disconnect = () => {
    setFirebaseApp(null);
    setFirestore(null);
    setIsConnected(false);
    setDocuments([]);
    setSelectedCollection("");
    localStorage.removeItem("firebaseConfig");
    toast.success("Disconnected from Firebase");
  };

  const refreshCollections = async () => {
    if (!firestore) return;
    setLoading(true);
    await discoverCollections(firestore);
    setLoading(false);
  };

  const truncateText = (text: string, maxLength = 30) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + "...";
  };

  const formatValue = (value: any) => {
    if (value === null || value === undefined) return "null";
    if (typeof value === "object") return JSON.stringify(value);
    return String(value);
  };

  const getDisplayFields = (docs: FirestoreDocument[]) => {
    if (docs.length === 0) return [];
    const allFields = Object.keys(docs[0]).filter((key) => key !== "id");
    return allFields.slice(0, 3);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Database className="h-8 w-8" />
          <h1 className="text-3xl font-bold">Firestore CRUD Manager</h1>
        </div>
        <div className="flex items-center gap-2">
          {isConnected ? (
            <Badge variant="default" className="bg-green-500">
              <CheckCircle className="h-4 w-4 mr-1" />
              Connected
            </Badge>
          ) : (
            <Badge variant="secondary">
              <AlertCircle className="h-4 w-4 mr-1" />
              Disconnected
            </Badge>
          )}
        </div>
      </div>

      {!isConnected ? (
        <Card>
          <CardHeader>
            <CardTitle>Firebase Connection</CardTitle>
            <CardDescription>
              Connect to your Firebase project to start managing Firestore data
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4">
              <div className="space-y-2">
                <Label htmlFor="apiKey">API Key *</Label>
                <Input
                  id="apiKey"
                  type="password"
                  placeholder="AIzaSyA-kvsdondsifndou0Q8"
                  value={config.apiKey}
                  onChange={(e) =>
                    setConfig({ ...config, apiKey: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="authDomain">Auth Domain *</Label>
                <Input
                  id="authDomain"
                  placeholder="your-project.firebaseapp.com"
                  value={config.authDomain}
                  onChange={(e) =>
                    setConfig({ ...config, authDomain: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="projectId">Project ID *</Label>
                <Input
                  id="projectId"
                  placeholder="your-project-id"
                  value={config.projectId}
                  onChange={(e) =>
                    setConfig({ ...config, projectId: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="storageBucket">Storage Bucket *</Label>
                <Input
                  id="storageBucket"
                  placeholder="your-project.firebasestorage.app"
                  value={config.storageBucket}
                  onChange={(e) =>
                    setConfig({ ...config, storageBucket: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="messagingSenderId">Messaging Sender ID *</Label>
                <Input
                  id="messagingSenderId"
                  placeholder="123456789012"
                  value={config.messagingSenderId}
                  onChange={(e) =>
                    setConfig({ ...config, messagingSenderId: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="appId">App ID *</Label>
                <Input
                  id="appId"
                  placeholder="1:123456789012:web:abcdef123456"
                  value={config.appId}
                  onChange={(e) =>
                    setConfig({ ...config, appId: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="bg-blue-50 p-3 rounded-md">
              <p className="text-sm text-blue-700">
                💡 <strong>Tip:</strong> You can find these values in your
                Firebase Console → Project Settings → General → Your apps →
                Firebase SDK snippet
              </p>
            </div>
            <Button
              onClick={() => connectToFirebase(config)}
              disabled={
                loading ||
                !config.apiKey ||
                !config.authDomain ||
                !config.projectId ||
                !config.storageBucket ||
                !config.messagingSenderId ||
                !config.appId
              }
              className="w-full"
            >
              {loading ? "Connecting..." : "Connect to Firebase"}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Label>Collection:</Label>
              {collections.length > 0 && (
                <select
                  className="px-3 py-2 border rounded-md"
                  value={selectedCollection}
                  onChange={(e) => {
                    setSelectedCollection(e.target.value);
                    if (e.target.value) loadCollection(e.target.value);
                  }}
                >
                  <option value="">Select discovered collection</option>
                  {collections.map((col) => (
                    <option key={col} value={col}>
                      {col}
                    </option>
                  ))}
                </select>
              )}
              <Input
                placeholder="Enter collection name"
                className="w-48"
                value={selectedCollection}
                onChange={(e) => setSelectedCollection(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === "Enter") {
                    const value = (e.target as HTMLInputElement).value;
                    if (value) {
                      loadCollection(value);
                    }
                  }
                }}
              />
              <Button
                onClick={() =>
                  selectedCollection && loadCollection(selectedCollection)
                }
                disabled={!selectedCollection || loading}
                size="sm"
              >
                Load Collection
              </Button>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={refreshCollections}
                disabled={loading}
              >
                <Database className="h-4 w-4 mr-1" />
                Refresh Collections
              </Button>
              <Dialog
                open={showConnectionDialog}
                onOpenChange={setShowConnectionDialog}
              >
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Settings className="h-4 w-4 mr-1" />
                    Settings
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Firebase Settings</DialogTitle>
                    <DialogDescription>
                      Manage your Firebase connection settings
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Project ID</Label>
                      <Input value={config.projectId} disabled />
                    </div>
                    <div className="space-y-2">
                      <Label>Auth Domain</Label>
                      <Input value={config.authDomain} disabled />
                    </div>
                    <div className="space-y-2">
                      <Label>Storage Bucket</Label>
                      <Input value={config.storageBucket} disabled />
                    </div>
                    <div className="space-y-2">
                      <Label>Discovered Collections</Label>
                      <div className="flex flex-wrap gap-1">
                        {collections.map((col) => (
                          <Badge key={col} variant="secondary">
                            {col}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <Button
                      onClick={disconnect}
                      variant="destructive"
                      className="w-full"
                    >
                      Disconnect
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          <Tabs defaultValue="data" className="space-y-4">
            <TabsList>
              <TabsTrigger value="data">Data Table</TabsTrigger>
              <TabsTrigger value="insert">Insert Data</TabsTrigger>
            </TabsList>

            <TabsContent value="data" className="space-y-4">
              {selectedCollection && documents.length > 0 ? (
                <Card>
                  <CardHeader>
                    <CardTitle>Collection: {selectedCollection}</CardTitle>
                    <CardDescription>
                      {documents.length} documents
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-[100px]">ID</TableHead>
                            {getDisplayFields(documents).map((field) => (
                              <TableHead key={field} className="min-w-[150px]">
                                {field}
                              </TableHead>
                            ))}
                            <TableHead className="w-[100px]">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {documents.map((doc) => (
                            <TableRow key={doc.id}>
                              <TableCell className="font-mono text-xs">
                                {/* {truncateText(doc.id, 15)} */}
                                {doc.id}
                              </TableCell>
                              {getDisplayFields(documents).map((field) => (
                                <TableCell
                                  key={field}
                                  className="max-w-[200px]"
                                >
                                  <div
                                    className="truncate"
                                    title={formatValue(doc[field])}
                                  >
                                    {truncateText(formatValue(doc[field]), 25)}
                                  </div>
                                </TableCell>
                              ))}
                              <TableCell>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      className="h-8 w-8 p-0"
                                    >
                                      <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem
                                      onClick={() => viewDocument(doc)}
                                    >
                                      <Eye className="mr-2 h-4 w-4" />
                                      View
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={() => startEditing(doc)}
                                    >
                                      <Edit className="mr-2 h-4 w-4" />
                                      Edit
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={() => deleteDocument(doc.id)}
                                      className="text-red-600"
                                    >
                                      <Trash2 className="mr-2 h-4 w-4" />
                                      Delete
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              ) : selectedCollection ? (
                <Card>
                  <CardContent className="text-center py-8">
                    <p className="text-muted-foreground">
                      No documents found in this collection
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="text-center py-8">
                    <p className="text-muted-foreground">
                      Select a collection to view data
                    </p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="insert" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Insert New Document</CardTitle>
                  <CardDescription>
                    {selectedCollection
                      ? `Add a new document to the "${selectedCollection}" collection`
                      : "Select a collection first"}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="jsonInput">JSON Data</Label>
                    <Textarea
                      id="jsonInput"
                      placeholder={`{
  "name": "New Item",
  "description": "This is a description",
  "price": 25.5,
  "category": "Electronics"
}`}
                      value={jsonInput}
                      onChange={(e) => setJsonInput(e.target.value)}
                      rows={10}
                      className="font-mono"
                    />
                  </div>
                  <Button
                    onClick={insertDocument}
                    disabled={
                      loading || !selectedCollection || !jsonInput.trim()
                    }
                    className="w-full"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    {loading ? "Inserting..." : "Insert Document"}
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      )}

      {/* View Document Dialog */}
      <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>View Document</DialogTitle>
            <DialogDescription>Document ID: {viewingDoc?.id}</DialogDescription>
          </DialogHeader>
          {viewingDoc && (
            <div className="space-y-4">
              <div className="grid gap-4">
                {Object.entries(viewingDoc)
                  .filter(([key]) => key !== "id")
                  .map(([key, value]) => (
                    <div key={key} className="space-y-2">
                      <Label className="font-semibold">{key}</Label>
                      <div className="p-3 bg-gray-50 rounded-md">
                        <pre className="text-sm whitespace-pre-wrap break-words">
                          {typeof value === "object"
                            ? JSON.stringify(value, null, 2)
                            : String(value)}
                        </pre>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Document</DialogTitle>
            <DialogDescription>Document ID: {editingDoc}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-4">
              {Object.entries(editValues).map(([key, value]) => {
                if (key === "__id") return null;

                return (
                  <div key={key} className="space-y-2">
                    <Label htmlFor={key}>{key}</Label>
                    <Textarea
                      id={key}
                      value={
                        typeof value === "object"
                          ? JSON.stringify(value, null, 2)
                          : String(value)
                      }
                      onChange={(e) => {
                        try {
                          const parsed = JSON.parse(e.target.value);
                          setEditValues({ ...editValues, [key]: parsed });
                        } catch {
                          setEditValues({
                            ...editValues,
                            [key]: e.target.value,
                          });
                        }
                      }}
                      rows={3}
                      className="font-mono"
                    />
                  </div>
                );
              })}
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={cancelEditing}>
                Cancel
              </Button>
              <Button
                onClick={() => editingDoc && updateDocument(editingDoc)}
                disabled={loading}
              >
                <Save className="h-4 w-4 mr-2" />
                {loading ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
