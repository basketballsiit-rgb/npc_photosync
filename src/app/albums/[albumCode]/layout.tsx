import type { Metadata } from "next";
import prisma from "@/lib/prisma";

type Props = {
  params: { albumCode: string };
  children: React.ReactNode;
};

export async function generateMetadata({
  params,
}: {
  params: { albumCode: string };
}): Promise<Metadata> {
  const { albumCode } = params;

  try {
    const album = await prisma.album.findFirst({
      where: {
        OR: [{ id: albumCode }, { albumCode: albumCode }],
      },
      select: {
        id: true,
        albumCode: true,
        title: true,
        eventDate: true,
        photoCount: true,
        coverThumbnailUrl: true,
        divisionName: true,
        departmentName: true,
      },
    });

    if (!album) {
      return {
        title: "คลังภาพกิจกรรม | วิทยาลัยสารพัดช่างน่าน",
      };
    }

    const eventDateStr = album.eventDate
      ? new Date(album.eventDate).toISOString().slice(0, 10)
      : "";
    const siteUrl = "https://service.npc.ac.th";
    const shareUrl = `${siteUrl}/npc_photosync/albums/${album.albumCode}?openExternalBrowser=1`;

    let coverUrl = "";
    if (album.coverThumbnailUrl && album.coverThumbnailUrl.startsWith("https://")) {
      coverUrl = album.coverThumbnailUrl;
    } else if (album.coverThumbnailUrl && album.coverThumbnailUrl.startsWith("http://")) {
      coverUrl = album.coverThumbnailUrl.replace(/^http:\/\//i, "https://");
    } else if (album.coverThumbnailUrl && album.coverThumbnailUrl.startsWith("/")) {
      coverUrl = `${siteUrl}${album.coverThumbnailUrl}`;
    } else {
      coverUrl =
        "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1200&auto=format&fit=crop&q=80";
    }

    const pageTitle = `📢 [คลังภาพกิจกรรม วช.น่าน] ${album.title}`;
    const pageDescription = `📌 ${album.title} | 📅 วันที่: ${eventDateStr} | 📸 ${album.photoCount} ภาพ | วิทยาลัยสารพัดช่างน่าน`;

    return {
      title: `${album.title} • คลังภาพกิจกรรม วิทยาลัยสารพัดช่างน่าน`,
      description: pageDescription,
      openGraph: {
        title: pageTitle,
        description: pageDescription,
        url: shareUrl,
        siteName: "NPC_PhotoSync • วิทยาลัยสารพัดช่างน่าน",
        images: [
          {
            url: coverUrl,
            width: 1200,
            height: 630,
            alt: album.title,
          },
        ],
        type: "article",
      },
      twitter: {
        card: "summary_large_image",
        title: pageTitle,
        description: pageDescription,
        images: [coverUrl],
      },
    };
  } catch (err) {
    return {
      title: "คลังภาพกิจกรรม วิทยาลัยสารพัดช่างน่าน",
    };
  }
}

export default function AlbumLayout({ children }: Props) {
  return <>{children}</>;
}
