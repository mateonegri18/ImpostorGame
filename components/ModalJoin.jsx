"use client";

import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function ModalJoin({ open, onClose, onJoin }) {
  const [code, setCode] = useState("");

  const handleConfirm = () => {
    if (!code) return;
    onJoin(code.toUpperCase());
  };

  const handleClose = () => {
    setCode("");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="bg-stone-900 border-red-800 text-white">
        <DialogHeader>
          <DialogTitle className="text-red-600 text-xl">Unirse a una sala</DialogTitle>
          <DialogDescription className="text-gray-300">
            Ingresá el código de sala que te pasaron.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3 py-3">
          <Input
            className="text-white bg-stone-800 text-center"
            maxLength={4}
            placeholder="Código (ej: ABCD)"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
          />
        </div>

        <DialogFooter className="flex gap-3">
          <Button
            variant="outline"
            className="border-red-800 bg-red-700 text-white"
            onClick={handleClose}
          >
            Cancelar
          </Button>

          <Button
            className="bg-green-500 text-white"
            onClick={handleConfirm}
            disabled={!code}
          >
            Unirse
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
