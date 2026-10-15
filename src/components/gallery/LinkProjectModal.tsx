"use client";

import React from "react";
import { RetroactiveLinkModal } from "./RetroactiveLinkModal";

export interface LinkProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  album: {
    albumCode: string;
    title: string;
    albumType: string;
  } | null;
  onLinkSuccess: (updatedAlbum: any) => void;
}

/**
 * Retroactive Project Linking Modal Component
 * Allows teachers and staff to search active projects from npc_smartflow and bind them to unlinked albums
 */
export function LinkProjectModal(props: LinkProjectModalProps) {
  return <RetroactiveLinkModal {...props} />;
}

export default LinkProjectModal;
