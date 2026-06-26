export default async function Page({ params }) {
  await connectDB(); // ✅ inside function

  const product = await Product.findOne({
    "seo.slug": params.slug,
  }).populate("variants");

  return <div>{product?.productName}</div>;
}
