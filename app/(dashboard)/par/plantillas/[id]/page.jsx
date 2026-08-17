"use client";

import { useParams } from "next/navigation";
import { ParTemplateForm } from "@/components/par/ParTemplateForm";

export default function EditarPlantillaPage() {
  const params = useParams();
  return <ParTemplateForm templateId={Number(params.id)} />;
}
