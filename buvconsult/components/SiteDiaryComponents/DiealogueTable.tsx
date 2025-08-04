import React, {useEffect, useState} from "react";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Trash2 } from "lucide-react";
import {Label} from "@/components/ui/label";
import {getSiteDiaryRecords, getSiteDiarySchema, saveSiteDiaryRecords} from "@/app/siteDiaryActions";
import {SubmitButton} from "@/app/components/dashboard/SubmitButtons";
import { toast } from "sonner";
import {deleteSiteDiaryRecord} from "@/app/siteDiaryActions";


export function useSiteSchema(siteId) {
  const [schema, setSchema] = useState(null);
  useEffect(() => {
    getSiteDiarySchema({ siteId }).then(setSchema);
  }, [siteId]);
  console.log(schema)
  return schema;
}


export function DialogTable({ date, siteId, onSaved}) {
  const schema = useSiteSchema(siteId);
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([
    {
      id: 1,
      date,
      location: "",
      works: "",
      units: "",
      amounts: "",
      workers: "",
      hours: "",
      comments: "",
    },
  ]);

  // Example options, replace as needed


  const handleAddRow = () => {
    setRows([
      ...rows,
      {
        id: Date.now(),
        date,
        location: "",
        works: "",
        units: "",
        amounts: "",
        workers: "",
        hours: "",
        comments: "",
      },
    ]);
  };

  const handleDeleteRow = async (id) => {
  const row = rows.find(r => r.id === id);
  if (row && typeof id === "string" && id.length > 10) { // crude UUID check
    await deleteSiteDiaryRecord({ id });
    toast.success("Record deleted!");
    // Optionally, reload rows from DB here
    if (onSaved) onSaved(); // trigger parent reload
  } else {
    setRows(rows.filter((row) => row.id !== id));
  }
};

  const handleChange = (id, field, value) => {
    setRows((prev) =>
        prev.map((row) =>
            row.id === id ? {...row, [field]: value} : row
        )
    );
  };

  const handleSubmit = async (e) => {
  e.preventDefault();

  // Map over rows, replace code with name
  const rowsToSave = rows.map(row => {
    const locationNode = schema.find(node => node.code === row.location);
    return {
      ...row,
      date: row.date instanceof Date ? row.date.toISOString().slice(0, 10) : row.date,
      location: locationNode?.name ?? "", // Replace code with name
    };
  });

  await saveSiteDiaryRecords({
    rows: rowsToSave,
    siteId: siteId,
  });

  toast.success("Record saved!");
  if (onSaved) onSaved();
};

  useEffect(() => {
    let cancelled = false;
    setLoading(true)


    if (!date || !siteId) {
      setRows([]);
      setLoading(false);
      return;
    }
    (async () => {
      const isoDate = typeof date === "string" ? date : date.toISOString();
      const loadedRows = await getSiteDiaryRecords({siteId, date: isoDate});
      if (!cancelled) {
        setRows(
            loadedRows.length
                ? loadedRows.map((row) => ({...row, id: row.id || Date.now() + Math.random()}))
                : [
                  {
                    id: Date.now(),
                    date,
                    location: "",
                    works: "",
                    units: "",
                    amounts: "",
                    workers: "",
                    hours: "",
                    comments: "",
                  },
                ]
        );
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [date, siteId]);


  // Here comes the getting settings for location/works
  function findLocationByCode(schema, code) {
  return schema?.find(node => node.code === code);
}

function collectWorks(node, prefix = "") {
  let options = [];
  if (node.type === "Work") {
    options.push({
      value: node.code,
      label: prefix ? `${prefix} / ${node.name}` : node.name
    });
  }
  if (node.children) {
    for (const child of node.children) {
      options = options.concat(
        collectWorks(child, node.type === "Work"
          ? (prefix ? `${prefix} / ${node.name}` : node.name)
          : prefix
        )
      );
    }
  }
  return options;
}




  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[300px]">
        Loading...
      </div>
    );
  }





    return (
        <form className="grid gap-3" onSubmit={handleSubmit}>
          <Card className="max-h-[500px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px]">Date</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Works</TableHead>
                  <TableHead className="text-center">Units</TableHead>
                  <TableHead className="text-center">Amounts</TableHead>
                  <TableHead className="text-center">Workers</TableHead>
                  <TableHead className="text-center">Hours</TableHead>
                  <TableHead className="w-[1500px] text-center">Comments</TableHead>
                  <TableHead className="w-[500px] text-center">Delete</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="font-medium">
                        {row.date
                            ? row.date.toLocaleDateString("en-GB", {
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                            })
                            : "No date selected"}
                      </TableCell>
                      <TableCell>
                        <Select
                            value={row.location}
                            onValueChange={(val) => handleChange(row.id, "location", val)}
                          >
                            <SelectTrigger className="w-[110px]">
                              <SelectValue placeholder="Select" />
                            </SelectTrigger>
                            <SelectContent>
                              {schema &&
                                schema
                                  .filter(node => node.type === "Location")
                                  .map(loc => (
                                    <SelectItem value={loc.code} key={loc.code}>
                                      {loc.name}
                                    </SelectItem>
                                  ))}
                            </SelectContent>
                          </Select>
                      </TableCell>
                      <TableCell>
                        {/** Get the selected location node for this row **/}
                          {(() => {
                            const selectedLocation = schema && findLocationByCode(schema, row.location);
                            const dynamicWorkOptions = selectedLocation ? collectWorks(selectedLocation) : [];
                            return (
                              <Select
                                value={row.works}
                                onValueChange={(val) => handleChange(row.id, "works", val)}
                              >
                                <SelectTrigger className="w-[110px]">
                                  <SelectValue placeholder="Select" />
                                </SelectTrigger>
                                <SelectContent>
                                  {dynamicWorkOptions.map(opt => (
                                    <SelectItem value={opt.label} key={opt.value}>
                                      {opt.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            );
                          })()}
                      </TableCell>
                      <TableCell className="text-right">
                        <Input
                            type="text"
                            className="w-20"
                            value={row.units}
                            onChange={(e) =>
                                handleChange(row.id, "units", e.target.value)
                            }
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <Input
                            type="text"
                            className="w-20"
                            value={row.amounts}
                            onChange={(e) =>
                                handleChange(row.id, "amounts", e.target.value)
                            }
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <Input
                            type="text"
                            className="w-20"
                            value={row.workers}
                            onChange={(e) =>
                                handleChange(row.id, "workers", e.target.value)
                            }
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <Input
                            type="text"
                            className="w-20"
                            value={row.hours}
                            onChange={(e) =>
                                handleChange(row.id, "hours", e.target.value)
                            }
                        />
                      </TableCell>
                      <TableCell className="text-center">
                        <Textarea
                            className="w-full h-[75px]"
                            value={row.comments}
                            onChange={(e) =>
                                handleChange(row.id, "comments", e.target.value)
                            }
                        />
                      </TableCell>
                      <TableCell className="text-center">
                        <Button
                            variant="ghost"
                            size="icon"
                            aria-label="Delete"
                            type="button"
                            onClick={() => handleDeleteRow(row.id)}
                        >
                          <Trash2 className="w-5 h-5"/>
                        </Button>
                      </TableCell>
                    </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>

          <div className="mt-4 flex justify-end gap-2">
            <Button type="button" onClick={handleAddRow} variant="outline">
              Add task
            </Button>
            <SubmitButton text="Save diary" onClick={handleSubmit} variant="default">

            </SubmitButton>
          </div>
          <div className="grid gap-3">
            <Label htmlFor="username-1">Username</Label>
            <Input id="username-1" name="username" defaultValue="@peduarte"/>
          </div>
          <div className="grid gap-3">
            <Label htmlFor="username-1">Username</Label>
            <Input id="username-1" name="username" defaultValue="@peduarte"/>
          </div>
        </form>
    );
  }
