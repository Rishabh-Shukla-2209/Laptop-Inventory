import LaptopForm from '@/components/laptops/LaptopForm';

export default async function EditLaptopPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <LaptopForm mode="edit" laptopId={id} />;
}
