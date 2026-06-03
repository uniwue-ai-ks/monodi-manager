import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { Button, Modal, ModalBody, ModalFooter, ModalHeader, TextInput, Tooltip } from "flowbite-react";
import { HiPencil, HiPlus, HiCog, HiArrowUpTray, HiHome } from "react-icons/hi2";
import { useAppState, slugify, addDoctype, renameDoctype } from "~/utils/flowStorage";

export const TopNavBar = () => {
  const storage = useAppState();
  const navigate = useNavigate();
  const doctypes = storage.contents.doctypes ?? [];

  const [renameTarget, setRenameTarget] = useState<{ slug: string; current: string } | null>(null);
  const [renameName, setRenameName] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [addName, setAddName] = useState("");

  const handleRenameOpen = (e: React.MouseEvent, slug: string, current: string) => {
    e.preventDefault();
    e.stopPropagation();
    setRenameTarget({ slug, current });
    setRenameName(current);
  };

  const handleRenameConfirm = () => {
    if (!renameTarget || !renameName.trim()) return;
    const newSlug = slugify(renameName.trim());
    const updated = renameDoctype(doctypes, renameTarget.slug, renameName.trim());
    storage.patchContents({ doctypes: updated });
    setRenameTarget(null);
    navigate(`/${newSlug}/import`);
  };

  const handleAddConfirm = () => {
    if (!addName.trim()) return;
    const updated = addDoctype(doctypes, addName.trim());
    storage.patchContents({ doctypes: updated });
    const slug = slugify(addName.trim());
    setAddOpen(false);
    setAddName("");
    navigate(`/${slug}/import`);
  };

  return (
    <>
      <nav className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-50">
        <div className="max-w-screen-xl mx-auto px-4 py-2 flex items-center gap-2 flex-wrap">
          {/* Home link + Doctype buttons */}
          <div className="flex items-center gap-1 flex-1 flex-wrap">
            <Tooltip content="Startseite" placement="bottom">
              <Link
                to="/"
                className="px-2 py-1.5 rounded text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors border border-transparent"
                aria-label="Startseite"
              >
                <HiHome className="w-4 h-4" />
              </Link>
            </Tooltip>
            {doctypes.map((dt) => {
              const slug = slugify(dt.name);
              return (
                <div key={slug} className="flex items-center">
                  <Link
                    to={`/${slug}/import`}
                    className="px-3 py-1.5 rounded-l text-sm font-medium bg-gray-100 hover:bg-gray-200 text-gray-800 transition-colors border border-r-0 border-gray-300"
                  >
                    {dt.name}
                  </Link>
                  <Tooltip content={`"${dt.name}" umbenennen`} placement="bottom">
                    <button
                      onClick={(e) => handleRenameOpen(e, slug, dt.name)}
                      className="px-1.5 py-1.5 rounded-r text-sm bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-gray-700 transition-colors border border-gray-300"
                      aria-label={`${dt.name} umbenennen`}
                    >
                      <HiPencil className="w-3.5 h-3.5" />
                    </button>
                  </Tooltip>
                </div>
              );
            })}
            <Tooltip content="Dokumententyp hinzufügen" placement="bottom">
              <button
                onClick={() => { setAddName(""); setAddOpen(true); }}
                className="px-2 py-1.5 rounded text-sm bg-blue-50 hover:bg-blue-100 text-blue-600 hover:text-blue-800 transition-colors border border-blue-200"
                aria-label="Neuen Dokumententyp hinzufügen"
              >
                <HiPlus className="w-4 h-4" />
              </button>
            </Tooltip>
          </div>

          {/* Right-side links */}
          <div className="flex items-center gap-2">
            <Link
              to="/frontmatter"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors"
            >
              <HiCog className="w-4 h-4" />
              Konfiguration
            </Link>
            <Link
              to="/export"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-medium bg-green-600 hover:bg-green-700 text-white transition-colors"
            >
              <HiArrowUpTray className="w-4 h-4" />
              Export
            </Link>
          </div>
        </div>
      </nav>

      {/* Rename modal */}
      <Modal show={renameTarget !== null} onClose={() => setRenameTarget(null)} size="sm">
        <ModalHeader>Dokumententyp umbenennen</ModalHeader>
        <ModalBody>
          <TextInput
            value={renameName}
            onChange={(e) => setRenameName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleRenameConfirm()}
            placeholder="Neuer Name"
            autoFocus
          />
        </ModalBody>
        <ModalFooter>
          <Button onClick={handleRenameConfirm} disabled={!renameName.trim()}>
            Umbenennen
          </Button>
          <Button color="light" onClick={() => setRenameTarget(null)}>
            Abbrechen
          </Button>
        </ModalFooter>
      </Modal>

      {/* Add doctype modal */}
      <Modal show={addOpen} onClose={() => setAddOpen(false)} size="sm">
        <ModalHeader>Neuen Dokumententyp anlegen</ModalHeader>
        <ModalBody>
          <TextInput
            value={addName}
            onChange={(e) => setAddName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAddConfirm()}
            placeholder="Name des Dokumententyps"
            autoFocus
          />
        </ModalBody>
        <ModalFooter>
          <Button onClick={handleAddConfirm} disabled={!addName.trim()}>
            Anlegen
          </Button>
          <Button color="light" onClick={() => setAddOpen(false)}>
            Abbrechen
          </Button>
        </ModalFooter>
      </Modal>
    </>
  );
};
