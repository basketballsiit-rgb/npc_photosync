import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { albumId: string } }
) {
  const { albumId } = params;

  try {
    const body = await req.json();
    const { isPublic } = body;

    const album = await prisma.album.findFirst({
      where: {
        OR: [{ id: albumId }, { albumCode: albumId }],
      },
    });

    if (!album) {
      return NextResponse.json(
        { success: false, error: "Album not found" },
        { status: 404 }
      );
    }

    const updated = await prisma.album.update({
      where: { id: album.id },
      data: {
        isPublic: typeof isPublic === "boolean" ? isPublic : !album.isPublic,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Updated album visibility to ${updated.isPublic ? "Public" : "Internal"}`,
      data: updated,
    });
  } catch (error) {
    console.error(`Error updating album ${albumId}:`, error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal Server Error",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { albumId: string } }
) {
  const { albumId } = params;

  try {
    const album = await prisma.album.findFirst({
      where: {
        OR: [{ id: albumId }, { albumCode: albumId }],
      },
    });

    if (!album) {
      return NextResponse.json(
        { success: false, error: "Album not found" },
        { status: 404 }
      );
    }

    // Cascade delete album (relations set to Cascade in Prisma)
    await prisma.album.delete({
      where: { id: album.id },
    });

    return NextResponse.json({
      success: true,
      message: `Album ${album.albumCode} deleted successfully.`,
    });
  } catch (error) {
    console.error(`Error deleting album ${albumId}:`, error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal Server Error",
      },
      { status: 500 }
    );
  }
}
